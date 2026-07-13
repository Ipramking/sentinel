import { getUser, hydrate, persist, recordTxn, uid } from "@/lib/store";

export const dynamic = "force-dynamic";

const TOPUP = 20000;

export async function POST(req: Request) {
  await hydrate();
  const { userId } = await req.json();
  const user = getUser(userId);
  if (!user) return Response.json({ error: "unknown user" }, { status: 404 });
  // No top-ups while coerced — the decoy account must stay believably empty.
  if (user.safeMode) return Response.json({ ok: false });

  recordTxn(user, { id: uid("t"), dir: "in", name: "Demo top-up", amount: TOPUP, ts: Date.now(), note: "Instant demo funding" });
  await persist();
  return Response.json({ ok: true, amount: TOPUP, balance: user.balance });
}
