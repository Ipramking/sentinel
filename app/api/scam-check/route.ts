import { db, getAiEngine, getUser, hydrate, persist, uid } from "@/lib/store";
import { analyzeMessage, type ScamVerdict } from "@/lib/gemini";
import { coreVerdict, train } from "@/lib/sentinel-core";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  await hydrate();
  const { userId, text, imageBase64, audioBase64, mimeType } = await req.json();
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
