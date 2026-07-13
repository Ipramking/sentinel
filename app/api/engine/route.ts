import { db, getAiEngine, hydrate, persist } from "@/lib/store";
import type { AiEngine } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  await hydrate();
  const userId = new URL(req.url).searchParams.get("userId") || "ada";
  return Response.json({
    aiEngine: getAiEngine(userId),
    core: { examples: db.model.examples, communityReports: db.model.communityReports, updatedAt: db.model.updatedAt },
  });
}

export async function POST(req: Request) {
  await hydrate();
  const { userId, aiEngine } = await req.json();
  const engine = String(aiEngine) as AiEngine;
  if (["auto", "gemini", "core"].includes(engine)) db.aiPrefs[userId] = engine;
  await persist();
  return Response.json({ aiEngine: getAiEngine(userId) });
}
