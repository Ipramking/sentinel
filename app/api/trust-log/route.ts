import { db, getAiEngine, getToggles, getUser, hydrate, persist } from "@/lib/store";
import type { DataToggles } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  await hydrate();
  const userId = new URL(req.url).searchParams.get("userId") || "ada";
  const user = getUser(userId);

  let decisions = db.decisions.filter((d) => d.userId === userId);
  let alerts = db.alerts.filter((a) => a.userId === userId);

  // While coerced, the app must not reveal that a silent alarm went off.
  if (user?.safeMode) {
    decisions = decisions.filter((d) => d.outcome !== "safe");
    alerts = alerts.filter((a) => a.kind !== "duress");
  }

  return Response.json({
    decisions: decisions.slice(0, 40),
    toggles: getToggles(userId),
    alerts: alerts.slice(0, 20),
    aiEngine: getAiEngine(userId),
    core: {
      examples: db.model.examples,
      communityReports: db.model.communityReports,
      updatedAt: db.model.updatedAt,
    },
  });
}

export async function POST(req: Request) {
  await hydrate();
  const { userId, key, value } = await req.json();

  const t = getToggles(userId);
  if (key in t) (t as unknown as Record<string, boolean>)[key] = !!value;
  db.toggles[userId] = t as DataToggles;
  await persist();
  return Response.json({ toggles: t });
}
