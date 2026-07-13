import { db, getUser, hydrate, persist, uid } from "@/lib/store";
import { train } from "@/lib/sentinel-core";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  await hydrate();
  const { userId, account, name, txnId, message } = await req.json();
  const user = getUser(userId);
  const acct = String(account || "");

  if (acct && !db.ledger.find((e) => e.account === acct)) {
    db.ledger.unshift({
      account: acct,
      name: name || "Reported scam account",
      reason: txnId ? "Someone who got scammed here reported it." : "Flagged after we stopped a scam payment.",
      reportedBy: user?.name || "A Sentinel customer",
      ts: Date.now(),
    });
  }

  // Herd immunity teaches Sentinel Core: every report is a labelled scam example.
  const lesson = [message, name].filter(Boolean).join(" ");
  if (lesson.trim()) {
    train(db.model, lesson, "scam");
    db.model.communityReports += 1;
  }

  // Reporting a past transfer they already fell for — flag it in their history too.
  if (user && txnId) {
    const txn = user.transactions.find((t) => t.id === txnId);
    if (txn) txn.reported = true;
  }

  db.alerts.unshift({
    id: uid("a"),
    userId,
    kind: "fraud-report",
    message: `We wrote up and filed the report on account ${acct}. Nobody else on Sentinel can pay it now.`,
    ts: Date.now(),
  });

  db.decisions.unshift({
    id: uid("d"),
    userId,
    kind: "report",
    title: "You reported a scam account",
    outcome: "alert",
    reason: `We added ${acct} to the shared threat list, so no other Sentinel user can send it money.`,
    dataUsed: ["Sentinel network threat feed"],
    ts: Date.now(),
  });

  await persist();
  return Response.json({ ok: true, ledgerCount: db.ledger.length });
}
