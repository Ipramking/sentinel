import { createUser, findUserByPhone, hydrate, persist } from "@/lib/store";
import { digits, str } from "@/lib/guard";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  await hydrate();
  const { name, phone, pin, duressPin } = await req.json();

  const cleanName = str(name, 60).trim();
  const cleanPhone = digits(phone, 11);
  const cleanPin = str(pin, 4);
  const cleanDuress = str(duressPin, 4);

  if (cleanName.length < 2) return Response.json({ ok: false, error: "Enter your full name." });
  if (cleanPhone.length !== 11) return Response.json({ ok: false, error: "Phone number must be 11 digits." });
  if (!/^\d{4}$/.test(cleanPin)) return Response.json({ ok: false, error: "PIN must be exactly 4 digits." });
  if (!/^\d{4}$/.test(cleanDuress)) return Response.json({ ok: false, error: "Duress PIN must be exactly 4 digits." });
  if (cleanPin === cleanDuress) return Response.json({ ok: false, error: "Your duress PIN must be different from your normal PIN." });
  if (findUserByPhone(cleanPhone)) return Response.json({ ok: false, error: "An account with this phone number already exists. Sign in instead." });

  const user = createUser({ name: cleanName, phone: cleanPhone, pin: cleanPin, duressPin: cleanDuress });
  await persist();
  return Response.json({ ok: true, userId: user.id, accountNumber: user.accountNumber });
}
