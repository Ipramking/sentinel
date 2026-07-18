# Sentinel — Live Demo Script

HackX 2026 (Union Bank × ECX) · Target runtime **≤ 3 minutes** · Live app:
https://sentinel-ifrenzys-projects.vercel.app

**Login PINs** — Ada: normal `1234`, panic `9111` · Bola: normal `4321`, panic `9222`.

The demo is built around one climax: the **duress reveal**. Everything before it sets the
stakes; everything after lands the point. Don't rush to it — the contrast is the show.

---

## 0:00 — Hook (on the sign-in screen)

> "Even after fraud fell by half last year, Nigerians and their banks still lost ₦25.85 billion
> to digital payment fraud in 2025. Every fraud app asks one question: *is this transaction
> risky?* Sentinel asks a second one that nobody else does: *is this person being forced?*
> Let me show you both."

**The numbers (for the deck / Q&A):**
- ₦25.85bn lost to digital payment fraud in Nigeria, 2025 — down 51% from ₦52.26bn in 2024.
- The fall was driven by better regulation and industry collaboration (banks sharing threat data).
- **Our angle:** Sentinel *is* that collaboration, built for the customer — herd immunity where one
  report protects everyone. And coercion / social-engineering is the gap collaboration alone can't
  close. *(Cite your source for the figures on the slide.)*

## 0:20 — A normal, protected transfer

- Sign in as **Ada** with the normal PIN `1234`.
- Start a transfer to a **new payee**. Point out the **risk score rising** (new payee,
  unusual amount) — Sentinel flags it for review *before* money moves.
- Complete a clean transfer to **Bola**. Show the **receipt** and that the balance actually
  changed. *"Real money moved between two real accounts — this is a product, not a mockup."*

## 0:55 — Catch a scam (ScamGuard)

- Open **ScamGuard**. Paste a scam text (fake BVN / prize message) or upload a screenshot.
  Show the verdict and the explanation.
- One line on the engine: *"This runs on-device with Sentinel Core, and it keeps learning —
  one person's report protects everyone. That's herd immunity."*

## 1:40 — THE CLIMAX: duress

- *"Now imagine I've been forced to log in — someone is standing over me demanding money."*
- Sign in as **Ada** again, but with the **panic PIN `9111`**.
- The app opens **completely normally** — decoy balance, real-looking home screen.
  **Pause here.** Let the judges see that nothing looks wrong.
- Do a transfer under duress. It "succeeds." Show the receipt.
- **Now reveal (to the judges):**
  - a **silent alarm already fired** to the trusted contact the moment I logged in,
  - the receipt is watermarked **FAKE**,
  - the public **`/verify`** page returns **"no record"** — no real money ever moved.
- Land it:
  > "The person forcing me saw a working bank app. Sentinel already called for help — and
  > never once gave itself away. That's *security that disappears when you're you.*"

## 2:40 — Close

> "Fraud scoring, an on-device learning model, real transfers — and a duress layer that
> protects you when the attacker is in the room. That's Sentinel."

---

## Presenter rules

- **Never** say or show "safe mode / duress mode" in the UI. The reveal is in the narration
  only — the whole point is that it stays invisible on screen.
- If nerves hit, the duress beat alone wins the room. Protect time for it.
- Reset the demo data before presenting if the screen looks cluttered.
