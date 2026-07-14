import { db, hydrate, persist, uid } from "@/lib/store";
import { maskAccount } from "@/lib/format";

export const dynamic = "force-dynamic";

/* Public receipt verification — the anti-"reverse fraud" check.
   A genuine reference returns the real transfer details.
   A decoy (duress) reference deliberately returns the same "no record" answer as a
   made-up one, so a coercer can't tell safe mode is on — but the owner's bank gets
   a silent alert that someone tried to pass a duress receipt off as payment. */
export async function POST(req: Request) {
  await hydrate();
  const body = await req.json();
  const ref = String(body.ref || "").trim().toUpperCase();
  if (!ref) return Response.json({ ok: false, error: "missing-ref" }, { status: 400 });

  for (const user of Object.values(db.users)) {
    const txn = user.transactions.find((t) => (t.ref || "").toUpperCase() === ref);
    if (txn) {
      return Response.json({
        ok: true,
        found: true,
        receipt: {
          ref: txn.ref,
          amount: txn.amount,
          dir: txn.dir,
          counterparty: txn.name,
          account: txn.account ? maskAccount(txn.account) : undefined,
          sender: `${user.name.split(/\s+/)[0]} •••`,
          ts: txn.ts,
          status: "Completed",
        },
      });
    }

    const decoy = (user.decoyTxns ?? []).find((t) => (t.ref || "").toUpperCase() === ref);
    if (decoy) {
      db.alerts.unshift({
        id: uid("a"),
        userId: user.id,
        kind: "duress",
        message: `Someone checked receipt ${ref}. It came from safe mode while you were being forced, so no money actually moved. We've saved this attempt as evidence.`,
        ts: Date.now(),
      });
      await persist();
      return Response.json({ ok: true, found: false });
    }
  }

  return Response.json({ ok: true, found: false });
}
