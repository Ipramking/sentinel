/* Input hardening + a PIN throttle.

   The demo trust model (client-supplied userId, no session token) is documented
   in docs/API.md and SECURITY.md — deliberately, so judges can switch accounts.
   These helpers cover the loopholes that matter even under that model: oversized
   input bloating the single Mongo snapshot document, and PIN brute-forcing. */

/** Clamp any value to a trimmed string of at most `max` characters. */
export function str(v: unknown, max: number): string {
  return String(v ?? "").slice(0, max);
}

/** Digits only, capped — for phone and account numbers. */
export function digits(v: unknown, max = 20): string {
  return String(v ?? "").replace(/\D/g, "").slice(0, max);
}

export const MAX_TRANSFER = 1_000_000_000; // ₦1bn — well past any real demo amount

/* Per-account PIN throttle. In-memory and per-instance on purpose: a real
   deployment would keep this shared counter in Redis so it holds across every
   serverless instance. Here it still demonstrates the control and stops a
   trivial local brute-force of a 4-digit PIN. */
const MAX_TRIES = 5;
const LOCK_MS = 60_000;
const attempts = new Map<string, { n: number; until: number }>();

/** Milliseconds a user must wait before another PIN try, or 0 if clear. */
export function pinLockRemaining(userId: string): number {
  const a = attempts.get(userId);
  if (!a) return 0;
  if (a.until && a.until > Date.now()) return a.until - Date.now();
  if (a.until && a.until <= Date.now()) attempts.delete(userId); // lock expired
  return 0;
}

/** Record a wrong PIN; locks the account once the try budget is spent. */
export function pinFail(userId: string) {
  const a = attempts.get(userId) ?? { n: 0, until: 0 };
  a.n += 1;
  if (a.n >= MAX_TRIES) a.until = Date.now() + LOCK_MS;
  attempts.set(userId, a);
}

/** A correct PIN clears the counter. */
export function pinOk(userId: string) {
  attempts.delete(userId);
}
