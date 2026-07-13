import { getUser, hydrate } from "@/lib/store";
import { maskPhone } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  await hydrate();
  const userId = new URL(req.url).searchParams.get("userId") || "ada";
  const user = getUser(userId);
  if (!user) return Response.json({ error: "unknown user" }, { status: 404 });

  return Response.json({
    user: {
      id: user.id,
      name: user.name,
      initials: user.initials,
      phone: maskPhone(user.phone),
      accountNumber: user.accountNumber,
    },
    balance: user.balance,
    transactions: user.transactions.slice().sort((a, b) => b.ts - a.ts),
  });
}
