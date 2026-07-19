# Sentinel

**Security that disappears when you're you.**

An AI fraud immune system for banking, built for HackX 2026 (Union Bank × ECX) by
Inioluwa, Anuoluwa and Craig.

**▶ Live demo:** https://sentinel-ifrenzys-projects.vercel.app
Sign in as **Ada** (PIN `1234`) or **Bola** (PIN `4321`) — or open your own account in ~20 seconds.

> **Judges — try the duress feature:** sign in with a **panic PIN** (Ada `9111`, Bola `9222`).
> Safe mode randomly shows one of two believable disguises — a **decoy account** (near-empty
> balance) or a **"connection lost" screen** — while your real money locks and a silent alarm
> fires. Both are intentional: a network-error screen here is the feature working, *not* a crash.
> Nothing on screen ever reveals safe mode. That's the part no other fraud tool has.

The idea: Your bank app should know how you behave. When a transfer looks
like you — someone you've paid before, a normal amount, a normal time — it goes straight
through with no extra friction. When something is off, Sentinel steps in, explains itself
in plain language, and acts. And every customer it protects makes the whole network
safer, because one person's scam report blocks that account for everyone.

Even after fraud fell 51% in 2025, Nigerians and their banks still lost ₦25.85bn to
digital payment fraud. The drop came from collaboration — Sentinel is that collaboration,
built for the customer, and it closes the gap collaboration leaves: coercion and social
engineering.

## What it does

- **Adaptive, risk-based authentication** — behavioural scoring routes each transfer to
  low-friction, step-up, or blocked. Never switches authentication off; it drops the
  redundant extra code on transfers it can already see are normal, and forces a strong
  step-up when risk rises.
- **You stay in charge** — a blocked transfer can still be sent if you acknowledge the
  risks. Your money, your final call, honestly logged.
- **ScamGuard** — paste a scam message or screenshot and the AI flags the manipulation.
- **Herd immunity** — one report blocks the scam account for every customer.
- **Duress PIN** — a second PIN that shows a believable decoy account while your real
  money locks and a silent alert goes out.
- **Trust Center** — every decision explained, with data-source controls you own.

## Tech stack

Next.js (App Router) · TypeScript · MongoDB · Google Gemini 2.5 Flash (text/screenshot/voice)
· Sentinel Core, our own naive-Bayes classifier · deployed on Vercel · 80+ end-to-end checks.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

Demo PINs, every endpoint, and `curl` examples: [docs/API.md](docs/API.md).
Security posture and trade-offs: [docs/SECURITY.md](docs/SECURITY.md).


## Credits

Team Sentinel — HackX 2026 (Union Bank × ECX)

- Ipram (@Ipramking) — Engineering & Product
- Anu (@Anades001) — Pitch Deck, Demo Script & Video
- Tobi (@0xSkyLax) — Scam Corpus & Model Training Data
