# Security notes

Sentinel is a hackathon prototype. This is an honest account of its security posture:
what we hardened, what's a deliberate demo trade-off, and how each trade-off would be
closed in production.

## Hardened

- **Bounded storage.** The demo DB is a single MongoDB document (16MB ceiling). Every
  log (`decisions`, `alerts`, `guardianAlerts`, `ledger`, per-user `transactions`) is
  capped so a long session or a scripted flood can't grow the snapshot until
  persistence silently fails. Newest entries are kept.
- **Input clamping.** `name`, `message`, and message `text` are length-capped; phone
  and account numbers are reduced to digits; transfer amounts must be finite,
  positive, and ≤ ₦1,000,000,000. A negative amount can't be used to reverse-drain a
  recipient, and oversized strings can't bloat the snapshot.
- **PIN brute-force throttle.** A 4-digit PIN is only 10,000 combinations, so
  `/api/unlock` locks an account for 60 seconds after 5 wrong tries. A correct normal
  *or duress* PIN clears the counter — the panic path is never locked out.
- **No arbitrary map writes.** `/api/engine` and `/api/trust-log` only accept a real
  `userId`, and toggles are restricted to a whitelist of the three known keys (so an
  `in`-check can't be tricked by inherited names like `constructor`).
- **Money conservation.** Internal transfers are double-entry: the sender is debited
  and a matching Sentinel recipient credited by the same amount, sharing one receipt
  reference. Self-transfers are rejected, and a coerced (safe-mode) send credits
  nobody — it's decoy theatre, so no real money moves.
- **Duress secrecy.** While in safe mode the API still reports `safeMode`, but the UI
  never shows it, decoy receipts return the same "no record" as a made-up reference,
  and the trust log hides the silent-alarm entries until the real PIN is used again.
- **No secrets in the client.** `GEMINI_API_KEY`, `MONGODB_URI`, and the Blob token
  are read only in server routes; `.env.local` is gitignored and never committed.

## Deliberate demo trade-offs

- **Client-supplied `userId` (the big one).** Routes identify the user from the request
  rather than a session token, so judges can switch between Ada and Bola freely. Now
  that transfers move real balances, this also means a crafted request could act as any
  account. **Production fix:** issue a signed, httpOnly session cookie on unlock and
  derive `userId` from it server-side; the request body would no longer be trusted for
  identity. This is the single change that turns the demo into something deployable.
- **Open faucet + reset.** `/api/topup` mints demo money and `/api/reset` reseeds the
  world, both unauthenticated, so anyone can set up a clean demo. In production both
  would be removed or admin-gated.
- **Per-instance throttle.** The PIN lockout counter lives in instance memory, so on
  multi-instance serverless it isn't shared. Production would keep it in Redis.
- **Snapshot concurrency.** The whole DB is one versioned document; two truly
  simultaneous writes can race (last-writer-wins). Real banking needs per-account
  atomic operations / row locks, not a whole-DB snapshot.

## Known dependency advisory

`npm audit` flags a moderate `postcss` issue reached through Next's build toolchain.
It's a build-time CSS-stringify concern, not a runtime path in this app, and the
suggested "fix" downgrades Next.js to v9 (a breaking regression), so we've left it.
