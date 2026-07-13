import { db, getUser, hydrate } from "@/lib/store";
import { maskPhone } from "@/lib/format";

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
    transactions,
    reportedAccounts: db.ledger.map((e) => e.account),
    network: { reports: db.ledger.length, protectedUsers: Object.keys(db.users).length },
  });
}
