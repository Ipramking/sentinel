import { db, getUser, hydrate } from "@/lib/store";
import { maskPhone } from "@/lib/format";
import { weeklyOut } from "@/lib/risk";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  await hydrate();
  const userId = new URL(req.url).searchParams.get("userId") || "ada";
  const user = getUser(userId);
  if (!user) return Response.json({ error: "unknown user" }, { status: 404 });

  // While coerced, every number on screen comes from the decoy — the response
  // shape stays identical so the app in front of the coercer looks ordinary.
  const safe = user.safeMode;
  const balance = safe ? user.decoyBalance : user.balance;
  const transactions = safe
    ? user.decoyTxns.slice().sort((a, b) => b.ts - a.ts)
    : user.transactions.slice().sort((a, b) => b.ts - a.ts);

  // Spending pace: this week's outflow vs a normal week. While coerced, use the
  // decoy history so nothing on screen looks out of place.
  const cutoff = Date.now() - 7 * 24 * 3600_000;
  const weekOut = safe
    ? user.decoyTxns.filter((t) => t.dir === "out" && t.ts >= cutoff).reduce((s, t) => s + t.amount, 0)
    : weeklyOut(user);
  const insight = {
    weekOut,
    typicalWeek: user.baseline.typicalWeekOut,
    ratio: weekOut / Math.max(1, user.baseline.typicalWeekOut),
  };

  const guardianOpenAlerts = db.guardianAlerts.filter(
    (a) => a.guardianId === userId && (a.status === "open" || a.status === "held"),
  ).length;

  return Response.json({
    user: {
      id: user.id,
      name: user.name,
      initials: user.initials,
      phone: maskPhone(user.phone),
      accountNumber: user.accountNumber,
      trustedContact: user.trustedContact,
    },
    balance,
    safeMode: safe,
    duressView: safe ? user.duressView ?? "decoy" : undefined,
    transactions,
    insight,
    guardianOpenAlerts,
    reportedAccounts: db.ledger.map((e) => e.account),
    network: { reports: db.ledger.length, protectedUsers: Object.keys(db.users).length },
  });
}
