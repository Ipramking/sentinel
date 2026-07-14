# Sentinel API reference

Everything the app does goes through these routes, so you can drive the whole demo
from `curl` if you want to see the engine without the UI. All routes live under
`/api/`, take and return JSON, and none of them need an API key.

**Demo trust model:** requests carry a `userId` instead of a session token. That's a
deliberate demo simplification so judges can poke at any account freely — a production
build would resolve the user from an authenticated session, not the request body.

## Demo accounts

| User | userId | Phone | PIN | Duress PIN |
| --- | --- | --- | --- | --- |
| Ada Okoro | `ada` | 08031112214 | 1234 | 9111 |
| Bola Adeyemi | `bola` | 08104550077 | 4321 | 9222 |

Bola is Ada's guardian out of the box. `POST /api/reset` puts everything back the way
it started.

---

### POST /api/signup

Open an account. Starts with ₦150,000 of demo money.

```json
{ "name": "Ngozi Bello", "phone": "08012345678", "pin": "2468", "duressPin": "8642" }
→ { "ok": true, "userId": "u_xxxxxxx", "accountNumber": "02XXXXXXXX" }
```

Rejected when the phone is taken, either PIN isn't 4 digits, or the two PINs match.

### POST /api/unlock

Sign in with `userId` or `phone`, plus `pin`. Optional `cadence` is the average
milliseconds between PIN-pad taps — a behavioural signal that gets learned and logged
but never blocks a sign-in by itself.

```json
{ "phone": "08031112214", "pin": "1234", "cadence": 340 }
→ { "ok": true, "mode": "normal", "userId": "ada" }
```

The duress PIN answers with the **same shape** (`"mode": "duress"`) and flips the
account into safe mode: decoy balance, decoy history, silent alarm to the fraud desk
and trusted contact. Nothing the phone renders afterwards betrays it.

### GET /api/state?userId=ada

The dashboard payload: profile, balance, transactions, weekly-pace insight, network
stats, open guardian alerts. While coerced, `balance`/`transactions` come from the
decoy and `safeMode: true` is only in the API response — the UI never shows it.

### POST /api/transfer

```json
{ "userId": "ada", "account": "0455667788", "name": "Chidera", "amount": 45000, "hour": 14 }
```

The risk engine scores it (new payee, size vs. your usual, weekly pace, odd hour,
network threat feed) and answers one of:

- `{ "status": "completed", "frictionless": true, "ref": "SNT-…" }` — looks like you, no friction
- `{ "status": "review", "risk": … }` — step up, then resend with `"confirm": true`
- `{ "status": "blocked", "risk": … }` — held; resend with `"override": true` if you insist
- `{ "status": "held", "holdUntil": … }` — your guardian pressed pause
- `{ "status": "failed", "error": "insufficient" }`

`hour` (0–23) is a demo control so you can simulate a 2am transfer at 2pm.

### POST /api/scam-check

Paste a message, screenshot, or voice note; get a verdict.

```json
{ "userId": "ada", "text": "Dear customer, your account has been BLOCKED…" }
→ { "verdict": { "verdict": "scam", "confidence": 99, "redFlags": [...], "advice": "…", "source": "gemini" }, "engine": "auto" }
```

`imageBase64` / `audioBase64` (+ `mimeType`) go to Gemini's vision/audio. Text-only
checks can run on **Sentinel Core**, our own naive-Bayes classifier — switch with
`/api/engine`. Confident cloud verdicts distil back into Core as training examples.

### GET/POST /api/engine

`GET ?userId=ada` → current engine (`auto` | `gemini` | `core`) plus Core's training
stats. `POST { "userId": "ada", "aiEngine": "core" }` switches.

### POST /api/report

```json
{ "userId": "ada", "account": "3388776655", "name": "Acct Verification Team", "txnId": "t_…", "message": "…" }
```

Herd immunity: the account lands on the shared threat ledger and every Sentinel user
is blocked from paying it, instantly. `txnId` flags a past transfer you already fell
for; `message` teaches Sentinel Core one more labelled scam.

### GET /api/ledger

The shared threat ledger, recent alerts, and how many people the network covers.

### POST /api/verify

Public receipt check — no account needed. `{ "ref": "SNT-XXXX-XXXX" }` returns the
real transfer for a genuine reference. A decoy (safe-mode) receipt returns the same
`{ "found": false }` as a made-up one, so a coercer learns nothing — and the owner
gets a silent alert that someone tried to use it as proof of payment.

### GET/POST /api/guardian

`GET ?userId=bola` → who guards you, who you guard, and their flagged attempts.
`POST` actions: `set` (by phone) / `remove` / `hold` / `release` / `clear`. A hold
pauses the ward's *risky* payments for 30 minutes; everyday payments still work.
Guardians see only the flagged attempt — never balances or history. Delay, not access.

### GET/POST /api/trust-log

`GET ?userId=ada` → every decision Sentinel made (with plain-language reasons and the
data each one used), security alerts, data toggles, engine + Core stats. While coerced
it quietly hides the duress entries. `POST { "userId", "key", "value" }` flips a data
toggle — switch `spendingHistory`, `deviceSignals`, or `networkFeed` off and the
checks they feed genuinely go quiet.

### POST /api/topup

`{ "userId": "ada" }` adds ₦20,000 of demo money. Refused (quietly) in safe mode —
a decoy account has to stay believably broke.

### POST /api/reset

Fresh seed data. Run it before a demo, or after you've wrecked Ada's balance.

---

Run the whole suite against a local server with `node verify.mjs` (expects the app on
`:3220` — `npm run build && npx next start -p 3220`).
