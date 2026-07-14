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

const TOGGLE_KEYS = ["spendingHistory", "deviceSignals", "networkFeed"] as const;

export async function POST(req: Request) {
  await hydrate();
  const { userId, key, value } = await req.json();
  // Real account only, and only the known toggle keys — no arbitrary map writes,
  // and nothing like "constructor" slipping through an `in` check.
  if (!getUser(userId)) return Response.json({ error: "unknown user" }, { status: 404 });
  if (!(TOGGLE_KEYS as readonly string[]).includes(key)) {
    return Response.json({ error: "unknown toggle" }, { status: 400 });
  }
  const t = getToggles(userId);
  (t as unknown as Record<string, boolean>)[key] = !!value;
  db.toggles[userId] = t as DataToggles;
  await persist();
  return Response.json({ toggles: t });
}
