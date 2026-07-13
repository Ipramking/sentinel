import { persist, resetDB } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST() {
  resetDB();
  await persist();
  return Response.json({ ok: true });
}
