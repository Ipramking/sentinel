import { db, getUser, hydrate, persist, recordTxn, uid } from "@/lib/store";
import { assessTransfer } from "@/lib/risk";
import { naira } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  await hydrate();
  const { userId, account, name, amount, hour, confirm, override } = await req.json();
  const user = getUser(userId);
  if (!user) return Response.json({ error: "unknown user" }, { status: 404 });

  const amt = Number(amount) || 0;
  const acct = String(account || "");
  const h = typeof hour === "number" ? hour : new Date().getHours();
  const risk = assessTransfer(user, amt, acct, h);

  const reasonText = risk.reasons.map((r) => r.text).join(" ");
  const dataUsed = Array.from(new Set(risk.reasons.map((r) => r.data)));
  const label = `${naira(amt)} to ${name || "recipient"}`;

  // Works against the decoy balance while coerced, so the duress account behaves real.
  const available = user.safeMode ? user.decoyBalance : user.balance;
  if (amt > available) {
    return Response.json({ status: "failed", error: "insufficient", available, risk });
  }

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
    // Sentinel learns: a send you completed makes this payee part of your normal pattern.
    // Never from a coerced session — those sends aren't "you".
    if (!user.safeMode && acct && !user.baseline.knownPayees.includes(acct)) {
      user.baseline.knownPayees.push(acct);
    }
    return txn as typeof txn & { ref?: string };
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
