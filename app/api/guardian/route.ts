import { db, findUserByPhone, getUser, hydrate, persist, uid } from "@/lib/store";
import { maskPhone } from "@/lib/format";

export const dynamic = "force-dynamic";

const HOLD_MS = 30 * 60_000; // a guardian pause lasts 30 minutes unless released

/* Guardian Mode. A guardian can see a flagged attempt and press pause on it.
   They never see the ward's balance, history, or anything else. Delay, not access. */

export async function GET(req: Request) {
  await hydrate();
  const userId = new URL(req.url).searchParams.get("userId") || "";
  const me = getUser(userId);
  if (!me) return Response.json({ error: "unknown user" }, { status: 404 });

  const myGuardian = me.guardianId ? getUser(me.guardianId) : undefined;
  const wards = Object.values(db.users)
    .filter((u) => u.guardianId === userId)
    .map((u) => ({ id: u.id, name: u.name }));
  const alerts = db.guardianAlerts.filter((a) => a.guardianId === userId).slice(0, 20);

  return Response.json({
    myGuardian: myGuardian ? { name: myGuardian.name, phone: maskPhone(myGuardian.phone) } : null,
    wards,
    alerts,
  });
}

export async function POST(req: Request) {
  await hydrate();
  const { userId, action, phone, alertId } = await req.json();
  const me = getUser(userId);
  if (!me) return Response.json({ error: "unknown user" }, { status: 404 });

  if (action === "set") {
    const target = findUserByPhone(phone);
    if (!target) return Response.json({ ok: false, error: "No Sentinel account uses that number." });
    if (target.id === me.id) return Response.json({ ok: false, error: "You can't be your own guardian." });
    me.guardianId = target.id;
    db.alerts.unshift({
      id: uid("a"),
      userId: me.id,
      kind: "guardian",
      message: `${target.name} is now your guardian. They'll hear about unusual transfer attempts and can pause them — they can't see your balance or move your money.`,
      ts: Date.now(),
    });
    await persist();
    return Response.json({ ok: true, guardian: { name: target.name, phone: maskPhone(target.phone) } });
  }

  if (action === "remove") {
    me.guardianId = undefined;
    await persist();
    return Response.json({ ok: true });
  }

  // hold / release / clear act on an alert this user guards
  const alert = db.guardianAlerts.find((a) => a.id === alertId && a.guardianId === userId);
  if (!alert) return Response.json({ ok: false, error: "alert not found" }, { status: 404 });
  const ward = getUser(alert.wardId);

  if (action === "hold") {
    alert.status = "held";
    alert.holdUntil = Date.now() + HOLD_MS;
    if (ward) {
      db.alerts.unshift({
        id: uid("a"),
        userId: ward.id,
        kind: "guardian",
        message: `${me.name} pressed pause on unusual payments for 30 minutes. Everyday transfers still work.`,
        ts: Date.now(),
      });
      db.decisions.unshift({
        id: uid("d"),
        userId: ward.id,
        kind: "transfer",
        title: "Your guardian paused a payment",
        outcome: "review",
        reason: `${me.name} saw the flagged attempt and asked for a short hold. Nothing was taken, and normal spending isn't affected.`,
        dataUsed: ["Guardian Mode"],
        ts: Date.now(),
      });
    }
  } else if (action === "release") {
    alert.status = "released";
    alert.holdUntil = 0;
    if (ward) {
      db.alerts.unshift({
        id: uid("a"),
        userId: ward.id,
        kind: "guardian",
        message: `${me.name} took another look and released the hold. You can send the payment now.`,
        ts: Date.now(),
      });
    }
  } else if (action === "clear") {
    alert.status = "cleared";
  } else {
    return Response.json({ ok: false, error: "unknown action" }, { status: 400 });
  }

  await persist();
  return Response.json({ ok: true, alert });
}
