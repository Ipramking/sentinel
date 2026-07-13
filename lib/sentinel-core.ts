import type { CoreModel } from "./types";
import { heuristicFlags, type ScamVerdict } from "./gemini";

/* Sentinel Core — our own scam classifier.
   A Bernoulli naive-Bayes model over message tokens. It ships pre-trained on a small
   Nigerian scam corpus and keeps learning two ways:
   - herd immunity: every community fraud report becomes a training example
   - distillation: confident Gemini verdicts teach it, so the on-device engine
     slowly inherits the cloud model's judgement
   The whole model lives in the DB, so it persists with everything else. */

const SCAM_SEED = [
  "Dear customer your account has been blocked due to failed BVN verification transfer the reactivation fee immediately or lose your funds",
  "Congratulations you have won 2,500,000 naira in the MTN mega promo send your account details and a processing fee to claim",
  "Your ATM card has been deactivated by CBN kindly call this customer care line and provide your OTP to reactivate",
  "This is your bank security team we noticed suspicious login move your money to this safe account now while we secure your profile",
  "Urgent your NIN is not linked your line will be barred in 24 hours click this link and verify with your PIN",
  "Hello mummy it's me I lost my phone please send 50,000 to my friend's account I will explain later it's urgent",
  "You have a pending refund of 185,000 from the federal grant scheme pay the 2,000 clearance charge to release it",
  "Final warning your account upgrade has expired send verification fee of 180,000 to the account below within 30 minutes",
  "I am a soldier on peacekeeping I want to invest in your country kindly receive my funds send your bank login to proceed",
  "Your package is on hold at customs pay the small clearance fee via transfer and reply with the OTP you receive",
  "Work from home and earn 150k weekly registration closes today pay the onboarding fee now to secure your slot",
  "Dear customer suspicious transaction detected reply with your card number and PIN to cancel it immediately",
  "You were shortlisted for the empowerment grant of 750,000 processing requires a token payment confirm with your BVN",
  "Sweetheart I want to send you a gift through a diplomat the agent needs a delivery charge paid to this account today",
  "Your electricity will be disconnected tonight pay your outstanding bill now to this personal account to avoid it",
  "Investment opportunity double your money in 48 hours guaranteed pay in now limited slots remaining",
];

const HAM_SEED = [
  "Good afternoon please send the project report before the standup tomorrow morning thanks",
  "Mummy I have sent the money for the market check your alert and buy the rice too",
  "Your order from the vendor has been dispatched and should arrive on Thursday between 10 and 4",
  "Meeting moved to 2pm same link as last week see you there",
  "Thanks for yesterday I really enjoyed the meetup let's do lunch next week",
  "The landlord said we can pay the rent in two parts this quarter which works better for you",
  "Reminder choir rehearsal holds by 5pm today come with the new hymn book",
  "I saw your missed call I was in class what's up",
  "Salary has been paid o check your account and let's plan the weekend",
  "The mechanic said the car will be ready tomorrow the fault was the alternator",
  "Can you resend the invoice the first attachment did not open on my system",
  "Happy birthday brother wishing you long life and prosperity enjoy your day",
];

function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z₦][a-z0-9₦'-]+/g) ?? []).slice(0, 400);
}

export function blankModel(): CoreModel {
  return { tokens: {}, docs: { s: 0, h: 0 }, examples: 0, communityReports: 0, updatedAt: Date.now() };
}

export function train(m: CoreModel, text: string, label: "scam" | "ham") {
  const seen = new Set(tokenize(text));
  if (!seen.size) return;
  for (const t of seen) {
    const e = (m.tokens[t] ??= { s: 0, h: 0 });
    if (label === "scam") e.s++;
    else e.h++;
  }
  if (label === "scam") m.docs.s++;
  else m.docs.h++;
  m.examples++;
  m.updatedAt = Date.now();
}

export function seedModel(): CoreModel {
  const m = blankModel();
  for (const t of SCAM_SEED) train(m, t, "scam");
  for (const t of HAM_SEED) train(m, t, "ham");
  m.examples = SCAM_SEED.length + HAM_SEED.length;
  return m;
}

/** P(scam | text) plus the tokens that pushed the verdict, for explainability. */
export function classify(m: CoreModel, text: string): { pScam: number; top: string[] } {
  const seen = new Set(tokenize(text));
  const total = m.docs.s + m.docs.h || 1;
  let logS = Math.log((m.docs.s + 1) / (total + 2));
  let logH = Math.log((m.docs.h + 1) / (total + 2));
  const weights: [string, number][] = [];
  for (const t of seen) {
    const e = m.tokens[t];
    if (!e || e.s + e.h < 1) continue;
    const ps = (e.s + 1) / (m.docs.s + 2);
    const ph = (e.h + 1) / (m.docs.h + 2);
    logS += Math.log(ps);
    logH += Math.log(ph);
    weights.push([t, Math.log(ps / ph)]);
  }
  const pScam = 1 / (1 + Math.exp(logH - logS));
  const top = weights
    .filter(([, w]) => w > 0.4)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([t]) => t);
  return { pScam, top };
}

export function coreVerdict(m: CoreModel, text: string): ScamVerdict {
  const { pScam, top } = classify(m, text);
  const verdict: ScamVerdict["verdict"] = pScam >= 0.85 ? "scam" : pScam >= 0.55 ? "suspicious" : "safe";
  const confidence = Math.round((verdict === "safe" ? 1 - pScam : pScam) * 100);
  const flags = verdict === "safe" ? [] : heuristicFlags(text);
  if (top.length && verdict !== "safe") {
    flags.push(`Words like ${top.map((t) => `“${t}”`).join(", ")} keep showing up in scams we've seen, ${m.docs.s} of them so far (${m.communityReports} sent in by people like you).`);
  }
  return {
    verdict,
    confidence: Math.max(35, Math.min(99, confidence)),
    redFlags: flags.length
      ? flags.slice(0, 5)
      : [verdict === "safe" ? "Nothing here looks like a scam." : "This reads a lot like scams we've caught before."],
    advice:
      verdict === "safe"
        ? "Looks fine. Just never give out your OTP or PIN to anyone."
        : "Don't send money or share any codes. Call your bank yourself using the number on your card.",
    source: "core",
  };
}
