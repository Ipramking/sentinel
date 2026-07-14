import { db, findUserByAccount, getUser, hydrate, persist, recordTxn, uid } from "@/lib/store";
import { assessTransfer } from "@/lib/risk";
import { naira } from "@/lib/format";
import { digits, str, MAX_TRANSFER } from "@/lib/guard";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  await hydrate();
  const body = await req.json();
  const { userId, hour, confirm, override } = body;
  const user = getUser(userId);
  if (!user) return Response.json({ error: "unknown user" }, { status: 404 });

  const amt = Number(body.amount) || 0;
  const acct = digits(body.account, 20);
  const name = str(body.name, 80);
  const h = typeof hour === "number" ? hour : new Date().getHours();

  // Money really moves now, so the amount has to be a real positive number in a
  // sane range — a negative "transfer" would quietly drain the recipient instead.
  if (!Number.isFinite(amt) || amt <= 0 || amt > MAX_TRANSFER) {
    return Response.json({ status: "failed", error: "amount" });
  }
  if (acct && acct === user.accountNumber) {
    return Response.json({ status: "failed", error: "self" });
  }

  const risk = assessTransfer(user, amt, acct, h);

  const reasonText = risk.reasons.map((r) => r.text).join(" ");
  const dataUsed = Array.from(new Set(risk.reasons.map((r) => r.data)));
  const label = `${naira(amt)} to ${name || "recipient"}`;

  // Works against the decoy balance while coerced, so the duress account behaves real.
  const available = user.safeMode ? user.decoyBalance : user.balance;
  if (amt > available) {
    return Response.json({ status: "failed", error: "insufficient", available, risk });
  }

  // A guardian hold pauses anything risky. Everyday (low-risk) payments still work —
  // a guardian can slow a scam down, never lock someone out of their own life.
  if (risk.level !== "allow" && !user.safeMode) {
    const hold = db.guardianAlerts.find(
      (a) => a.wardId === userId && a.status === "held" && (a.holdUntil ?? 0) > Date.now(),
    );
    if (hold) {
      return Response.json({ status: "held", holdUntil: hold.holdUntil, risk });
    }
  }

  // Tell the guardian about a fresh risky attempt (first sight only, not confirm/override).
  const notifyGuardian = () => {
    if (!user.guardianId || user.safeMode) return;
    db.guardianAlerts.unshift({
      id: uid("g"),
      wardId: user.id,
      wardName: user.name,
      guardianId: user.guardianId,
      amount: amt,
      name: name || "Unknown recipient",
      account: acct,
      risk: risk.level === "block" ? "block" : "review",
      status: "open",
      ts: Date.now(),
    });
  };

  const complete = () => {
    const txn = {
      id: uid("t"),
      dir: "out" as const,
      name: name || "Recipient",
      account: acct,
      amount: amt,
      ts: Date.now(),
    };
    recordTxn(user, txn);
    const withRef = txn as typeof txn & { ref?: string };

    // If the account number belongs to a Sentinel user, the money really arrives:
    // their balance grows and the incoming transfer (same receipt ref) lands in
    // their history. Never from a coerced session — safe-mode sends are decoy
    // theatre, so no real money moves and nobody gets credited.
    if (!user.safeMode) {
      const recipient = findUserByAccount(acct);
      if (recipient && recipient.id !== user.id) {
        // Credit the real balance directly, even if the recipient is themselves
        // coerced right now — their money is real, they just can't see it yet.
        recipient.balance += amt;
        recipient.transactions.unshift({
          id: uid("t"),
          dir: "in",
          name: user.name,
          account: user.accountNumber,
          amount: amt,
          ts: withRef.ts,
          note: "Sentinel transfer",
          ref: withRef.ref,
        });
      }
    }

    // Sentinel learns: a send you completed makes this payee part of your normal pattern.
    // Never from a coerced session — those sends aren't "you".
    if (!user.safeMode && acct && !user.baseline.knownPayees.includes(acct)) {
      user.baseline.knownPayees.push(acct);
    }
    return withRef;
  };

  if (risk.level === "allow") {
    const txn = complete();
    db.decisions.unshift({
      id: uid("d"),
      userId,
      kind: "transfer",
      title: `Sent ${label}`,
      outcome: "allowed",
      reason: risk.reasons[0]?.text || "Nothing unusual about this one.",
      dataUsed,
      ts: Date.now(),
    });
    await persist();
    return Response.json({ status: "completed", frictionless: true, ref: txn.ref, risk });
  }

  if (risk.level === "block") {
    if (override) {
      const txn = complete();
      db.decisions.unshift({
        id: uid("d"),
        userId,
        kind: "transfer",
        title: `Sent ${label} (you overrode)`,
        outcome: "override",
        reason: `You told us you know this person and sent it anyway. ${reasonText}`,
        dataUsed,
        ts: Date.now(),
      });
      await persist();
      return Response.json({ status: "completed", overridden: true, ref: txn.ref, risk });
    }
    notifyGuardian();
    db.decisions.unshift({
      id: uid("d"),
      userId,
      kind: "transfer",
      title: `Blocked ${label}`,
      outcome: "blocked",
      reason: reasonText,
      dataUsed,
      ts: Date.now(),
    });
    await persist();
    return Response.json({ status: "blocked", risk });
  }

  // review
  if (confirm) {
    const txn = complete();
    db.decisions.unshift({
      id: uid("d"),
      userId,
      kind: "transfer",
      title: `Sent ${label} after a check`,
      outcome: "review",
      reason: `You cleared a quick check, then it went out. ${reasonText}`,
      dataUsed,
      ts: Date.now(),
    });
    await persist();
    return Response.json({ status: "completed", steppedUp: true, ref: txn.ref, risk });
  }

  notifyGuardian();
  db.decisions.unshift({
    id: uid("d"),
    userId,
    kind: "transfer",
    title: `Asked you to confirm ${label}`,
    outcome: "review",
    reason: reasonText,
    dataUsed,
    ts: Date.now(),
  });
  await persist();
  return Response.json({ status: "review", risk });
}
