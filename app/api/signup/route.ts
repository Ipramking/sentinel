import { createUser, findUserByPhone, hydrate, persist } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  await hydrate();
  const { name, phone, pin } = await req.json();

  const cleanName = String(name || "").trim();
  const cleanPhone = String(phone || "").replace(/\D/g, "");
  const cleanPin = String(pin || "");

  if (cleanName.length < 2) return Response.json({ ok: false, error: "Enter your full name." });
  if (cleanPhone.length !== 11) return Response.json({ ok: false, error: "Phone number must be 11 digits." });
  if (!/^\d{4}$/.test(cleanPin)) return Response.json({ ok: false, error: "PIN must be exactly 4 digits." });
  if (findUserByPhone(cleanPhone)) return Response.json({ ok: false, error: "An account with this phone number already exists. Sign in instead." });

  const user = createUser({ name: cleanName, phone: cleanPhone, pin: cleanPin });
  await persist();
  return Response.json({ ok: true, userId: user.id, accountNumber: user.accountNumber });
}
