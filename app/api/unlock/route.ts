import { activateSafeMode, db, findUserByPhone, getUser, hydrate, persist, uid } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  await hydrate();
  const { userId, phone, pin } = await req.json();
  const user = userId ? getUser(userId) : findUserByPhone(phone);
  if (!user) return Response.json({ ok: false, mode: "no-account" });

  if (pin === user.pin) {
    user.safeMode = false;
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

  if (pin === user.duressPin) {
    activateSafeMode(user);
    const msg = `Someone entered the duress PIN on ${user.name}'s account. We hid the real balance, locked the money, and quietly pinged the bank's fraud desk and ${user.trustedContact}.`;
    db.alerts.unshift({ id: uid("a"), userId: user.id, kind: "duress", message: msg, ts: Date.now() });
    db.decisions.unshift({
      id: uid("d"),
      userId: user.id,
      kind: "unlock",
      title: "Duress PIN used, safe mode on",
      outcome: "safe",
      reason: msg,
      dataUsed: ["Duress PIN"],
      ts: Date.now(),
    });
    await persist();
    // The response is deliberately identical in shape to a normal sign-in —
    // nothing the phone shows from here on may hint that safe mode is live.
    return Response.json({ ok: true, mode: "duress", userId: user.id });
  }

  return Response.json({ ok: false, mode: "wrong" });
}
