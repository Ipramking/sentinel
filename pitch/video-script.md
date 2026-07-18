# Sentinel — Demo Video Script (shoot this)

**Target ≤ 3 minutes.** Screen-record the live app: https://sentinel-ifrenzys-projects.vercel.app
`[DO]` = what you click · **"SAY"** = read aloud, word for word.

**Before you record:** app open at the sign-in screen, demo data reset, phone-shaped window.
Login PINs — Ada: normal `1234`, panic `9111` · Bola: normal `4321`.

---

## 0:00 — Cold open *(sign-in screen)*
**SAY:** "Every fraud app asks the same question — *is this transaction risky?* Sentinel asks a
second one that nobody else does: *is this person being forced?* Let me show you both."

## 0:18 — Normal transfer
`[DO]` Sign in as **Ada** with `1234`. Send to a **new payee**; enter an amount.
**SAY:** "Here's a normal transfer. The moment I add a new payee, Sentinel's risk score climbs
— new recipient, unusual amount — and it pauses to check before any money moves."

`[DO]` Confirm the transfer to **Bola**. Show the receipt and the changed balance.
**SAY:** "I approve it, and the money actually moves — real balance, real receipt, between two
real accounts. This isn't a mockup. It's a working bank."

## 0:50 — ScamGuard
`[DO]` Open **ScamGuard**. Paste a scam text (or upload a screenshot / voice note). Show the verdict.
**SAY:** "This is ScamGuard. I drop in a suspicious message — text, screenshot, even a voice note
— and Sentinel flags it instantly, running on-device with an engine we call Sentinel Core. And it
learns: one person's report protects everyone on the network. That's herd immunity."

## 1:30 — The duress climax *(slow down — this is the moment)*
**SAY:** "Now the part no other fraud tool does. Imagine I've been forced to log in — someone is
standing over me, demanding money."

`[DO]` Sign in as **Ada** again — with the **panic PIN `9111`**. Let the home screen sit for
**3 full seconds**. Say nothing.
**SAY:** *(after the pause)* "Notice — the app opened completely normally. A balance, a home
screen. Nothing looks wrong. That's the point."

`[DO]` Do a transfer under duress; show it "succeed" with a receipt.
**SAY:** "I send the money. It succeeds. The person forcing me is satisfied — but watch what
really happened."

`[DO]` Point to the **FAKE** watermark on the receipt, then open **`/verify`** and search that
reference → "no record."
**SAY:** "That receipt is watermarked *fake*. The public verify page has no record of it. No real
money ever left my account — and the instant I entered that PIN, a silent alarm went out to my
trusted contact. The attacker never had a clue."

## 2:30 — Close *(tagline card or sign-in screen)*
**SAY:** "Fraud scoring, an on-device model that learns, real transfers — and a duress layer that
protects you when the danger is a person in the room. That's Sentinel. *Security that disappears
when you're you.*"

**[END — fade]**

---

## Three things that make or break the video
- **The 3-second silence** on the duress home screen is the most important moment — don't fill it.
  The stillness *is* the pitch.
- **Never let the words "safe mode" or "duress" appear on screen.** The reveal lives in the
  narration only.
- If a line runs long while recording, cut words — never the duress beat. That's the scene judges
  remember.

## Delivery
Export MP4 → upload to Drive or unlisted YouTube → paste the link into GitHub issue #3 and close it.
