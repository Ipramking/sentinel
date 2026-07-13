import { db, getUser, hydrate, persist, uid } from "@/lib/store";
import { analyzeMessage } from "@/lib/gemini";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  await hydrate();
  const { userId, text, imageBase64, mimeType } = await req.json();
  const user = getUser(userId);

  const image = imageBase64 ? { data: imageBase64, mimeType: mimeType || "image/png" } : undefined;
  const verdict = await analyzeMessage(text, image);

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
