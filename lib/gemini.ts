export type ScamVerdict = {
  verdict: "scam" | "suspicious" | "safe";
  confidence: number; // 0..100
  redFlags: string[];
  advice: string;
  source: "gemini" | "fallback";
};

const MODEL = "gemini-2.5-flash";

const SYSTEM = `You are Sentinel, a fraud analyst protecting Nigerian bank customers.
Analyse the message (and screenshot image if present) a customer received before they send money.
Detect social-engineering and financial scams: fake bank/BVN/NIN alerts, "account blocked/suspended",
OTP/PIN requests, prize/lottery wins, impersonation of family or officials, urgency and threats,
fake POS/refund requests, romance and job scams, and requests to move money to a "safe" account.
Respond ONLY with strict JSON, no markdown, of the exact shape:
{"verdict":"scam|suspicious|safe","confidence":0-100,"redFlags":["short plain-language flag", ...],"advice":"one short sentence of what the customer should do"}
Write the redFlags and advice the way a sharp friend would warn you: plain, casual, direct. Use contractions,
short sentences, no jargon and no corporate tone. Max 5 flags.`;

const SCAM_WORDS = [
  "otp", "pin", "bvn", "nin", "verify", "verification", "blocked", "suspend", "suspended",
  "deactivat", "reactivat", "upgrade your account", "won", "winner", "prize", "lottery",
  "congratulations", "urgent", "immediately", "expire", "click", "link", "kindly send",
  "send money", "transfer", "gift card", "safe account", "security account", "arrest",
  "court", "refund", "customer care", "cbn", "account will be", "dear customer",
];

/** Plain-language red flags used by the on-device rules fallback. */
export function heuristicFlags(text?: string): string[] {
  const t = (text ?? "").toLowerCase();
  const flags: string[] = [];
  if (/\b(otp|pin|bvn|nin)\b/.test(t)) flags.push("It's asking for your OTP, PIN, BVN or NIN. Your bank will never do that.");
  if (/(block|suspend|deactivat|expire|reactivat)/.test(t)) flags.push("It says your account is blocked or about to expire, just to rush you.");
  if (/(won|winner|prize|lottery|congratulation)/.test(t)) flags.push("It says you won something you never entered.");
  if (/(urgent|immediately|now|within \d)/.test(t)) flags.push("It's pushing you to act fast so you don't stop and think.");
  if (/(click|http|bit\.ly|link)/.test(t)) flags.push("There's a link that probably steals your details.");
  if (/(safe account|security account|move your (money|fund))/.test(t)) flags.push("It wants you to move money to a 'safe' account. That's a classic trick.");
  if (/(send|transfer|pay).{0,20}(money|₦|naira|\d{3,})/.test(t)) flags.push("It's straight-up asking you to send money.");
  return flags;
}

function fallback(text?: string): ScamVerdict {
  const t = (text ?? "").toLowerCase();
  const flags = heuristicFlags(text);

  const hits = SCAM_WORDS.filter((w) => t.includes(w)).length;
  let verdict: ScamVerdict["verdict"] = "safe";
  let confidence = 20;
  if (flags.length >= 2 || hits >= 3) {
    verdict = "scam";
    confidence = Math.min(96, 70 + flags.length * 6 + hits * 2);
  } else if (flags.length === 1 || hits >= 1) {
    verdict = "suspicious";
    confidence = 55;
  }
  return {
    verdict,
    confidence,
    redFlags: flags.length ? flags : ["Nothing jumps out as a scam here. Still, be careful with anyone rushing you for money."],
    advice:
      verdict === "safe"
        ? "Looks fine. Just never give out your OTP or PIN to anyone."
        : "Don't send money or share any codes. Call your bank yourself using the number on your card.",
    source: "fallback",
  };
}

function parseJson(raw: string): Partial<ScamVerdict> | null {
  try {
    const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1) return null;
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}

export async function analyzeMessage(
  text?: string,
  image?: { data: string; mimeType: string }, // a screenshot of the suspicious message
): Promise<ScamVerdict> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return fallback(text);

  try {
    const parts: unknown[] = [{ text: SYSTEM }];
    if (text && text.trim()) parts.push({ text: `Message from customer:\n"""${text.trim()}"""` });
    if (image?.data) parts.push({ inline_data: { mime_type: image.mimeType, data: image.data } });
    if (!text && !image) return fallback(text);

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            temperature: 0.15,
            responseMimeType: "application/json",
            // Skip the model's thinking phase — verdicts need to feel instant in the demo.
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
        signal: AbortSignal.timeout(15000),
      },
    );
    if (!res.ok) return fallback(text);
    const json = await res.json();
    const raw: string | undefined = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsed = raw ? parseJson(raw) : null;
    if (!parsed || !parsed.verdict) return fallback(text);

    return {
      verdict: parsed.verdict,
      confidence: Math.max(0, Math.min(100, Number(parsed.confidence) || 70)),
      redFlags:
        Array.isArray(parsed.redFlags) && parsed.redFlags.length
          ? parsed.redFlags.slice(0, 5)
          : [parsed.verdict === "safe" ? "Nothing here looks like a scam." : "This message is trying to play you."],
      advice: parsed.advice || "Don't send money or share any codes. Check with your bank yourself first.",
      source: "gemini",
    };
  } catch {
    return fallback(text);
  }
}
