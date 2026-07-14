import { db, getAiEngine, getUser, hydrate, persist, uid } from "@/lib/store";
import { analyzeMessage, type ScamVerdict } from "@/lib/gemini";
import { coreVerdict, train } from "@/lib/sentinel-core";
import { str } from "@/lib/guard";

export const dynamic = "force-dynamic";

// Base64 media is forwarded to Gemini, never stored — but cap it so an oversized
// body can't OOM the function.
const MAX_MEDIA = 8_000_000; // ~6MB decoded

export async function POST(req: Request) {
  await hydrate();
  const body = await req.json();
  const { userId, mimeType } = body;
  const text = str(body.text, 10_000);
  const imageBase64 = str(body.imageBase64, MAX_MEDIA);
  const audioBase64 = str(body.audioBase64, MAX_MEDIA);
  if (String(body.imageBase64 ?? "").length > MAX_MEDIA || String(body.audioBase64 ?? "").length > MAX_MEDIA) {
    return Response.json({ error: "media too large" }, { status: 413 });
  }
  const user = getUser(userId);
  const engine = getAiEngine(userId);

  const media = imageBase64
    ? { data: imageBase64, mimeType: mimeType || "image/png" }
    : audioBase64
      ? { data: audioBase64, mimeType: mimeType || "audio/ogg" }
      : undefined;

  // Sentinel Core is text-only; screenshots and voice notes go to the multimodal cloud model.
  let verdict: ScamVerdict;
  if (engine === "core" && text && !media) {
    verdict = coreVerdict(db.model, text);
  } else {
    verdict = await analyzeMessage(text, media);
  }

  // Distillation: confident cloud verdicts become training examples for our own model,
  // so Sentinel Core slowly inherits the cloud model's judgement.
  if (text && verdict.source === "gemini" && verdict.confidence >= 85 && verdict.verdict !== "suspicious") {
    train(db.model, text, verdict.verdict === "scam" ? "scam" : "ham");
  }

  if (user) {
    db.decisions.unshift({
      id: uid("d"),
      userId,
      kind: "scam",
      title: `Checked a message: ${verdict.verdict}`,
      outcome: verdict.verdict === "scam" ? "blocked" : verdict.verdict === "suspicious" ? "review" : "allowed",
      reason: verdict.redFlags.join(" "),
      dataUsed: [
        text ? "Message text" : "",
        imageBase64 ? "Screenshot image (AI vision)" : "",
        audioBase64 ? "Voice note (AI listened)" : "",
        verdict.source === "gemini" ? "Gemini AI" : verdict.source === "core" ? "Sentinel Core (our model)" : "On-device rules",
      ].filter(Boolean),
      ts: Date.now(),
    });
  }

  await persist();
  return Response.json({ verdict, engine });
}
