import { activateSafeMode, db, findUserByPhone, getUser, hydrate, persist, uid } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  await hydrate();
  const { userId, phone, pin, cadence } = await req.json();
  const user = userId ? getUser(userId) : findUserByPhone(phone);
  if (!user) return Response.json({ ok: false, mode: "no-account" });

  if (pin === user.pin) {
    user.safeMode = false;

    /* Behavioural rhythm — the average gap between PIN-pad taps, measured on the
       client. It's a learned signal, logged honestly, and never blocks a sign-in:
       a mismatch on its own just gets noted (in production it would raise the
       running risk score, not lock anyone out). */
    let reason = "Right PIN. Nothing else to check.";
    const dataUsed = ["PIN"];
    const ms = Number(cadence);
    if (Number.isFinite(ms) && ms > 0 && ms < 5000) {
      dataUsed.push("PIN tap rhythm");
      const base = user.baseline.cadence;
      if (base && base.samples >= 3) {
        const ratio = ms / base.mean;
        reason =
          ratio > 0.55 && ratio < 1.8
            ? "Right PIN, and you typed it at your usual speed. Sent you straight in."
            : "Right PIN, but you typed it faster or slower than usual. We just took note. That alone never locks you out.";
        base.mean = Math.round(base.mean * 0.7 + ms * 0.3);
        base.samples += 1;
      } else {
        const prev = base ?? { mean: ms, samples: 0 };
        user.baseline.cadence = {
          mean: Math.round((prev.mean * prev.samples + ms) / (prev.samples + 1)),
          samples: prev.samples + 1,
        };
        reason = `Right PIN. We're still learning how you type it (${user.baseline.cadence.samples} of 3 sign-ins so far).`;
      }
    }

    db.decisions.unshift({
      id: uid("d"),
      userId: user.id,
      kind: "unlock",
      title: "Signed in",
      outcome: "allowed",
      reason,
      dataUsed,
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
