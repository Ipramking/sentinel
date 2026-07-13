import { db, findUserByPhone, getUser, hydrate, persist, uid } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  await hydrate();
  const { userId, phone, pin } = await req.json();
  const user = userId ? getUser(userId) : findUserByPhone(phone);
  if (!user) return Response.json({ ok: false, mode: "no-account" });

  if (pin === user.pin) {
    db.decisions.unshift({
      id: uid("d"),
      userId: user.id,
      kind: "unlock",
      title: "Signed in",
      outcome: "allowed",
      reason: "Right PIN on a device we know.",
      dataUsed: ["PIN"],
      ts: Date.now(),
    });
    await persist();
    return Response.json({ ok: true, mode: "normal", userId: user.id });
  }

  return Response.json({ ok: false, mode: "wrong" });
}
