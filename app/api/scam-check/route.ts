import { db, getUser, hydrate, persist, uid } from "@/lib/store";
import { analyzeMessage } from "@/lib/gemini";
import { train } from "@/lib/sentinel-core";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  await hydrate();
  const { userId, text, imageBase64, mimeType } = await req.json();
  const user = getUser(userId);

  const image = imageBase64 ? { data: imageBase64, mimeType: mimeType || "image/png" } : undefined;
  const verdict = await analyzeMessage(text, image);

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
        verdict.source === "gemini" ? "Gemini AI" : "On-device rules",
      ].filter(Boolean),
      ts: Date.now(),
    });
  }

  await persist();
  return Response.json({ verdict });
}
