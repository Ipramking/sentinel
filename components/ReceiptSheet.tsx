"use client";

import { Icon } from "./icons";
import { Sheet } from "./ui";
import { downloadReceipt } from "@/lib/receipt";
import { naira } from "@/lib/format";

export type ReceiptTxn = {
  id: string;
  dir: "in" | "out";
  name: string;
  account?: string;
  amount: number;
  ts: number;
  note?: string;
  ref?: string;
  reported?: boolean;
};

/* On screen this looks like any real bank receipt — in safe mode that IS the decoy.
   Only the downloaded file carries the FAKE watermark, so the coercer sees nothing
   unusual but can never use the artifact as proof of payment. */
export function ReceiptSheet({
  txn,
  userName,
  userAccount,
  safeMode,
  reportable,
  alreadyReported,
  busy,
  onClose,
  onReport,
}: {
  txn: ReceiptTxn | null;
  userName: string;
  userAccount: string;
  safeMode: boolean;
  reportable: boolean;
  alreadyReported: boolean;
  busy: boolean;
  onClose: () => void;
  onReport: (t: ReceiptTxn) => void;
}) {
  if (!txn) return null;
  const out = txn.dir === "out";

  return (
    <Sheet open={!!txn} onClose={onClose}>
      <div className="text-center">
        <div
          className="mx-auto flex items-center justify-center"
          style={{ width: 52, height: 52, borderRadius: 16, background: alreadyReported ? "var(--danger-bg)" : "var(--ok-bg)", color: alreadyReported ? "var(--danger)" : "var(--ok)" }}
        >
          <Icon name={alreadyReported ? "flag" : "check-circle"} size={28} />
        </div>
        <div className="amount font-bold mt-2.5" style={{ fontSize: "1.75rem" }}>
          {out ? "−" : "+"}
          {naira(txn.amount)}
        </div>
        <div className="text-sm" style={{ color: "var(--muted)" }}>
          {out ? "to" : "from"} {txn.name}
        </div>
        <span className={"chip mt-2 " + (alreadyReported ? "chip-danger" : "chip-ok")}>
          {alreadyReported ? "Reported as scam" : "Completed"}
        </span>
      </div>

      <div className="card-soft mt-4" style={{ padding: "4px 14px" }}>
        <ReceiptRow label={out ? "Recipient" : "Sender"} value={txn.name} />
        {txn.account && <ReceiptRow label="Account" value={txn.account} mono />}
        <ReceiptRow label="Reference" value={txn.ref || "—"} mono copyable />
        <ReceiptRow label="Date" value={new Date(txn.ts).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })} />
        {txn.note && <ReceiptRow label="Note" value={txn.note} />}
        <ReceiptRow label="Channel" value="Sentinel instant transfer" last />
      </div>

      <button
        className="btn btn-primary btn-block mt-4"
        onClick={() =>
          downloadReceipt(
            {
              ref: txn.ref || "—",
              amount: txn.amount,
              dir: txn.dir,
              counterparty: txn.name,
              account: txn.account,
              note: txn.note,
              ts: txn.ts,
              userName,
              userAccount,
            },
            safeMode,
          )
        }
      >
        <Icon name="download" size={18} /> Download receipt
      </button>

      {reportable && (
        <div className="mt-3">
          <p className="text-xs mb-2" style={{ color: "var(--muted)" }}>
            Got scammed on this one? Report it, and this account is blocked for everyone on Sentinel right away.
          </p>
          <button className="btn btn-danger btn-block" disabled={busy} onClick={() => onReport(txn)}>
            <Icon name="flag" size={15} /> {busy ? "Reporting…" : "Report as scam"}
          </button>
        </div>
      )}
      {alreadyReported && (
        <p className="text-xs mt-3 font-semibold text-center" style={{ color: "var(--danger)" }}>
          This account's on the threat list. Nobody on Sentinel can pay it again.
        </p>
      )}

      <p className="text-center text-[0.6875rem] mt-3" style={{ color: "var(--muted)" }}>
        Anyone can confirm this at <b>/verify</b> with the reference.
      </p>
    </Sheet>
  );
}

function ReceiptRow({ label, value, mono, copyable, last }: { label: string; value: string; mono?: boolean; copyable?: boolean; last?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5" style={{ borderBottom: last ? "none" : "1px solid var(--line)" }}>
      <span className="text-xs shrink-0" style={{ color: "var(--muted)" }}>{label}</span>
      <span className={`text-[0.8125rem] font-semibold text-right ${mono ? "mono" : ""}`} style={{ wordBreak: "break-word" }}>
        {value}
        {copyable && (
          <button
            className="chip chip-muted ml-1.5"
            style={{ border: "none", cursor: "pointer", padding: "2px 7px" }}
            onClick={() => navigator.clipboard?.writeText(value).catch(() => {})}
            aria-label={`Copy ${label}`}
          >
            <Icon name="copy" size={11} />
          </button>
        )}
      </span>
    </div>
  );
}
