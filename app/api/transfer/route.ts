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

  if (amt > user.balance) {
    return Response.json({ status: "failed", error: "insufficient", available: user.balance, risk });
  }

  const complete = () => {
    recordTxn(user, {
      id: uid("t"),
      dir: "out",
      name: name || "Recipient",
      account: acct,
      amount: amt,
      ts: Date.now(),
    });
    // Sentinel learns: a send you completed makes this payee part of your normal pattern.
    if (acct && !user.baseline.knownPayees.includes(acct)) {
      user.baseline.knownPayees.push(acct);
    }
  };

  if (risk.level === "allow") {
    complete();
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
    return Response.json({ status: "completed", frictionless: true, risk });
  }

  if (risk.level === "block") {
    if (override) {
      complete();
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
      return Response.json({ status: "completed", overridden: true, risk });
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
    complete();
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
    return Response.json({ status: "completed", steppedUp: true, risk });
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
