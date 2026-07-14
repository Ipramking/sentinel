"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { StatusCard } from "@/components/ui";
import { api } from "@/lib/client";
import { naira } from "@/lib/format";

type Receipt = {
  ref: string;
  amount: number;
  dir: "in" | "out";
  counterparty: string;
  account?: string;
  sender: string;
  ts: number;
  status: string;
};

/* Public — no sign-in needed. A seller shown a Sentinel receipt as "proof of payment"
   pastes the reference here. Genuine refs return the transfer; anything else (including
   duress decoy receipts) returns "no record", so fake proof never works. */
export default function Verify() {
  const [ref, setRef] = useState("");
  const [checked, setChecked] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [busy, setBusy] = useState(false);

  async function check() {
    setBusy(true);
    setChecked(false);
    setReceipt(null);
    try {
      const r = await api.verifyRef(ref);
      setReceipt(r.found ? r.receipt : null);
      setChecked(true);
    } catch {
      setChecked(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="shell">
      <header className="hero px-5 pt-5 pb-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="icon-btn" style={{ color: "#fff", background: "rgba(255,255,255,0.1)" }} aria-label="Back">
            <Icon name="chevron" size={18} style={{ transform: "rotate(180deg)" }} />
          </Link>
          <div>
            <h1 className="display font-bold text-xl">Verify a receipt</h1>
            <p className="text-[0.78125rem] text-white/70">
              Anyone can check a Sentinel receipt. You don't need an account.
            </p>
          </div>
        </div>
      </header>

      <div className="scroll p-4 fade-in">
        <div className="card">
          <label className="label">Receipt reference</label>
          <input
            className="input mono"
            value={ref}
            onChange={(e) => { setRef(e.target.value.toUpperCase()); setChecked(false); }}
            placeholder="SNT-XXXX-XXXX"
            autoCapitalize="characters"
          />
          <button className="btn btn-primary btn-block mt-3" disabled={busy || ref.trim().length < 6} onClick={check}>
            <Icon name="search" size={17} /> {busy ? "Checking…" : "Check reference"}
          </button>
        </div>

        {checked && receipt && (
          <StatusCard tone="ok" className="fade-in mt-4">
            <div className="flex items-center gap-2 font-bold" style={{ color: "var(--ok)" }}>
              <Icon name="check-circle" size={22} /> This one's real
            </div>
            <div className="card-soft mt-3" style={{ padding: "4px 14px", background: "var(--surface)" }}>
              <VRow label="Amount" value={naira(receipt.amount)} />
              <VRow label="Paid to" value={receipt.counterparty} />
              {receipt.account && <VRow label="Account" value={receipt.account} mono />}
              <VRow label="Sender" value={receipt.sender} />
              <VRow label="Date" value={new Date(receipt.ts).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })} />
              <VRow label="Status" value={receipt.status} last />
            </div>
          </StatusCard>
        )}

        {checked && !receipt && (
          <StatusCard tone="danger" className="fade-in mt-4">
            <div className="flex items-center gap-2 font-bold" style={{ color: "var(--danger)" }}>
              <Icon name="alert" size={22} /> We've got no record of this
            </div>
            <p className="text-[0.8125rem] mt-2" style={{ color: "var(--muted)" }}>
              This transfer never happened on Sentinel. If someone's showing you this as proof they paid,
              <b> don't hand over goods, services or cash</b>. The money didn't move. A screenshot is easy to fake.
              This check isn't.
            </p>
          </StatusCard>
        )}

        <p className="text-center text-xs mt-5" style={{ color: "var(--muted)" }}>
          <Icon name="shield-check" size={13} className="inline align-[-2px]" /> Every real Sentinel transfer has a reference you can check right here.
        </p>
      </div>
    </div>
  );
}

function VRow({ label, value, mono, last }: { label: string; value: string; mono?: boolean; last?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5" style={{ borderBottom: last ? "none" : "1px solid var(--line)" }}>
      <span className="text-xs shrink-0" style={{ color: "var(--muted)" }}>{label}</span>
      <span className={`text-[0.8125rem] font-semibold text-right ${mono ? "mono" : ""}`}>{value}</span>
    </div>
  );
}
