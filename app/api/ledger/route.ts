import { db, hydrate } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  await hydrate();
  return Response.json({
    ledger: db.ledger,
    alerts: db.alerts,
    protectedUsers: Object.keys(db.users).length,
  });
}
