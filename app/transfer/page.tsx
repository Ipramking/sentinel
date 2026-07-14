"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Icon } from "@/components/icons";
import { SectionLabel, StatusCard } from "@/components/ui";
import { api, getUserId } from "@/lib/client";
import { naira, maskAccount } from "@/lib/format";
import { downloadReceipt } from "@/lib/receipt";

type Reason = { text: string; data: string };
type Risk = { score: number; level: string; headline: string; reasons: Reason[]; ledgerHit?: { name?: string; reason: string; reportedBy: string } };
type Result = { status: string; frictionless?: boolean; steppedUp?: boolean; overridden?: boolean; error?: string; available?: number; ref?: string; risk: Risk };
type Me = { name: string; accountNumber: string; safeMode: boolean };

const SHORTCUTS = [
  { label: "Mummy · ₦15,000", name: "Mummy", account: "0221145678", amount: "15000" },
  { label: "New friend · ₦45,000", name: "Chidera (new)", account: "0455667788", amount: "45000" },
  { label: "⚠ Suspicious · ₦180,000", name: "Acct Verification Team", account: "3388776655", amount: "180000" },
];

export default function Transfer() {
  const router = useRouter();
  const uid = typeof window !== "undefined" ? getUserId() : "ada";
  const [balance, setBalance] = useState<number | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [phase, setPhase] = useState<"form" | "review" | "blocked" | "done">("form");
  const [name, setName] = useState("");
  const [account, setAccount] = useState("");
  const [amount, setAmount] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [reported, setReported] = useState(false);
  const [netReports, setNetReports] = useState(0);

  useEffect(() => {
    api.state(uid).then((s) => {
      setBalance(s.balance);
      setNetReports(s.network.reports);
      setMe({ name: s.user.name, accountNumber: s.user.accountNumber, safeMode: s.safeMode });
    }).catch(() => {});
  }, [uid]);

  const amt = Number(amount) || 0;
  const canSend = account.length >= 4 && amt > 0;

  async function submit() {
    setBusy(true);
    setFormError("");
    try {
      const r: Result = await api.transfer(uid, account, name, amt);
      if (r.status === "failed" && r.error === "insufficient") {
        setFormError(`Not enough in the account. You've got ${naira(r.available ?? 0)} available.`);
        return;
      }
      setResult(r);
      setPhase(r.status === "completed" ? "done" : r.status === "blocked" ? "blocked" : "review");
    } finally {
      setBusy(false);
    }
  }

  async function sendAnyway() {
    setBusy(true);
    try {
      const r: Result = await api.overrideTransfer(uid, account, name, amt);
      if (r.status === "completed") {
        setResult(r);
        setPhase("done");
      }
    } finally {
      setBusy(false);
    }
  }

  async function stepUp() {
    setBusy(true);
    try {
      const r: Result = await api.confirmTransfer(uid, account, name, amt);
      setResult(r);
      setPhase("done");
    } finally {
      setBusy(false);
    }
  }

  async function fileReport() {
    setBusy(true);
    try {
      await api.report(uid, account, name || "Reported scam account");
      const s = await api.state(uid);
      setNetReports(s.network.reports);
      setReported(true);
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setPhase("form");
    setResult(null);
    setReported(false);
    setName("");
    setAccount("");
    setAmount("");
    api.state(uid).then((s) => setBalance(s.balance)).catch(() => {});
  }

  return (
    <AppShell active="/transfer">
      {/* header */}
      <div className="hero" style={{ padding: "16px 20px" }}>
        <div className="text-[0.78125rem]" style={{ opacity: 0.8 }}>Send money</div>
        <div className="display font-bold text-lg">
          {balance == null ? "…" : <span className="amount">{naira(balance)}</span>}{" "}
          <span className="text-[0.78125rem] font-normal" style={{ opacity: 0.8 }}>available</span>
        </div>
      </div>

      <div className="p-4 fade-in">
        {phase === "form" && (
          <>
            <div className="card">
              <label className="label">Recipient name</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Mummy" />
              <label className="label mt-3">Account number</label>
              <input className="input mono" inputMode="numeric" value={account} onChange={(e) => setAccount(e.target.value.replace(/\D/g, ""))} placeholder="10-digit account" />
              <label className="label mt-3">Amount (₦)</label>
              <input className="input amount" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))} placeholder="0" />
            </div>

            <div className="mt-4">
              <SectionLabel>Demo shortcuts</SectionLabel>
            </div>
            <div className="flex flex-col gap-2">
              {SHORTCUTS.map((s) => (
                <button
                  key={s.label}
                  className="card-soft flex justify-between items-center text-left"
                  style={{ cursor: "pointer", minHeight: 48 }}
                  onClick={() => { setName(s.name); setAccount(s.account); setAmount(s.amount); }}
                >
                  <span className="text-sm font-semibold">{s.label}</span>
                  <Icon name="chevron" size={16} style={{ color: "var(--muted)" }} />
                </button>
              ))}
            </div>

            {formError && (
              <div className="text-[0.8125rem] font-semibold mt-3 text-center" style={{ color: "var(--danger)" }} role="alert">
                {formError}
              </div>
            )}
            <button className="btn btn-primary btn-block mt-4" disabled={!canSend || busy} onClick={submit}>
              {busy ? "Checking…" : "Continue"}
            </button>
            <p className="text-center text-xs mt-2.5" style={{ color: "var(--muted)" }}>
              <Icon name="shield-check" size={13} className="inline align-[-2px]" /> We check every transfer in the background, so you don't have to
            </p>
          </>
        )}

        {phase === "review" && result && (
          <StepUp result={result} name={name} amount={amt} busy={busy} onConfirm={stepUp} onCancel={() => setPhase("form")} />
        )}

        {phase === "blocked" && result && (
          <Blocked
            result={result}
            account={account}
            reported={reported}
            netReports={netReports}
            busy={busy}
            onReport={fileReport}
            onOverride={sendAnyway}
            onCancel={() => router.push("/dashboard")}
          />
        )}

        {phase === "done" && result && (
          <Done result={result} name={name} account={account} amount={amt} me={me} onHome={() => router.push("/dashboard")} onAgain={reset} />
        )}
      </div>
    </AppShell>
  );
}

function ScoreBar({ score }: { score: number }) {
  const color = score >= 70 ? "var(--danger)" : score >= 35 ? "var(--warn)" : "var(--ok)";
  return (
    <div>
      <div className="flex justify-between text-xs mb-1" style={{ color: "var(--muted)" }}>
        <span>Risk score</span>
        <span className="amount font-bold" style={{ color }}>{score}/100</span>
      </div>
      <div style={{ height: 8, borderRadius: 99, background: "var(--bg)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${score}%`, background: color, transition: "width .5s ease" }} />
      </div>
    </div>
  );
}

function Reasons({ reasons }: { reasons: Reason[] }) {
  return (
    <div className="flex flex-col gap-2.5 mt-3.5">
      {reasons.map((r, i) => (
        <div key={i} className="flex gap-2.5 items-start">
          <div style={{ color: "var(--brand-2)", marginTop: 1 }}><Icon name="info" size={17} /></div>
          <div>
            <div className="text-sm">{r.text}</div>
            <span className="chip chip-brand mt-1" style={{ fontSize: "0.6875rem" }}>{r.data}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function StepUp({ result, name, amount, busy, onConfirm, onCancel }: { result: Result; name: string; amount: number; busy: boolean; onConfirm: () => void; onCancel: () => void }) {
  return (
    <StatusCard tone="warn" className="fade-in">
      <div className="flex items-center gap-2" style={{ color: "var(--warn)" }}>
        <Icon name="fingerprint" size={22} />
        <div className="display font-bold">{result.risk.headline}</div>
      </div>
      <p className="text-sm my-2" style={{ color: "var(--muted)" }}>
        You&rsquo;re sending <span className="amount font-semibold" style={{ color: "var(--ink)" }}>{naira(amount)}</span> to {name || "this person"}. This one&rsquo;s a little outside your usual pattern, so we need one more thing before it goes: a quick fingerprint, or the one-time code your bank sends.
      </p>
      <ScoreBar score={result.risk.score} />
      <Reasons reasons={result.risk.reasons} />
      <button className="btn btn-primary btn-block mt-4" disabled={busy} onClick={onConfirm}>
        <Icon name="fingerprint" size={18} /> {busy ? "Verifying…" : "Verify with fingerprint"}
      </button>
      <button className="btn btn-ghost btn-block mt-2" onClick={onCancel}>Cancel</button>
    </StatusCard>
  );
}

function Blocked({ result, account, reported, netReports, busy, onReport, onOverride, onCancel }: { result: Result; account: string; reported: boolean; netReports: number; busy: boolean; onReport: () => void; onOverride: () => void; onCancel: () => void }) {
  const hit = result.risk.ledgerHit;
  const [showOverride, setShowOverride] = useState(false);
  const [ack, setAck] = useState(false);
  return (
    <div className="fade-in">
      <StatusCard tone="danger">
        <div className="flex items-center gap-2" style={{ color: "var(--danger)" }}>
          <Icon name="alert" size={24} />
          <div className="display font-bold text-base">{result.risk.headline}</div>
        </div>
        <p className="text-sm my-2" style={{ color: "var(--muted)" }}>
          We&rsquo;re holding this one for a second. Take a breath. Here&rsquo;s what caught our eye.
        </p>
        <ScoreBar score={result.risk.score} />
        <Reasons reasons={result.risk.reasons} />

        {hit && (
          <div className="mt-3.5" style={{ background: "var(--surface)", border: "1px solid var(--danger-line)", borderRadius: 12, padding: "10px 12px" }}>
            <div className="flex items-center gap-2 font-bold text-[0.8125rem]" style={{ color: "var(--danger)" }}>
              <Icon name="users" size={16} /> Blocked by the Sentinel network
            </div>
            <div className="text-[0.78125rem] mt-0.5" style={{ color: "var(--muted)" }}>
              {hit.reportedBy} reported it. You&rsquo;re covered before this scam ever reached you.
            </div>
          </div>
        )}
      </StatusCard>

      {/* what Sentinel already did */}
      <div className="card mt-3">
        <div className="font-bold text-sm mb-2.5">What we did for you</div>
        <Action done icon="pause" text="Froze the transfer right away" />
        <Action done icon="clock" text="Started a 60-second breather" />
        <Action done={reported} icon="doc" text={reported ? "Report filed, network covered" : "Write up and file a report"} />
        {!hit && !reported && (
          <button className="btn btn-danger btn-block mt-3" disabled={busy} onClick={onReport}>
            {busy ? "Filing…" : "Report it and protect everyone"}
          </button>
        )}
        {reported && (
          <div className="text-[0.78125rem] font-semibold mt-2.5" style={{ color: "var(--ok)" }}>
            ✓ {account} is on the list now. That&rsquo;s {netReports} scam account{netReports === 1 ? "" : "s"} nobody on Sentinel can pay.
          </div>
        )}
      </div>

      {/* user override — their money, their final call */}
      {!reported && (
      <div className="card mt-3">
        {!showOverride ? (
          <button
            className="w-full text-left flex items-center gap-2.5"
            style={{ background: "transparent", border: "none", cursor: "pointer", minHeight: 44, padding: 0 }}
            onClick={() => setShowOverride(true)}
          >
            <div style={{ color: "var(--muted)" }}><Icon name="fingerprint" size={20} /></div>
            <div className="flex-1">
              <div className="font-semibold text-sm">Dead sure about this one?</div>
              <div className="text-xs" style={{ color: "var(--muted)" }}>It&rsquo;s your call. Look over the risks and send it anyway</div>
            </div>
            <Icon name="chevron" size={18} style={{ color: "var(--muted)" }} />
          </button>
        ) : (
          <div className="fade-in">
            <div className="font-bold text-sm">Send anyway</div>
            <p className="text-[0.8125rem] mt-1.5" style={{ color: "var(--muted)" }}>
              {hit
                ? "Somebody else already flagged this account. Once you send, the money's gone and you usually can't get it back."
                : "Everything here says this isn't your normal move. Once you send, the money's gone and you usually can't get it back."}
            </p>
            <label className="flex items-start gap-2.5 mt-3 text-[0.8125rem]" style={{ cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={ack}
                onChange={(e) => setAck(e.target.checked)}
                style={{ width: 18, height: 18, marginTop: 1, accentColor: "var(--brand-2)", flexShrink: 0 }}
              />
              <span>I know this person, and I get that this money might not come back.</span>
            </label>
            <button className="btn btn-ghost btn-block mt-3" style={{ color: "var(--danger)" }} disabled={!ack || busy} onClick={onOverride}>
              {busy ? "Sending…" : "I'm sure, send it"}
            </button>
            <button className="btn btn-ghost btn-block mt-2" onClick={() => { setShowOverride(false); setAck(false); }}>
              Keep it blocked
            </button>
          </div>
        )}
      </div>
      )}

      <button className="btn btn-ghost btn-block mt-3" onClick={onCancel}>Close</button>
    </div>
  );
}

function Action({ done, icon, text }: { done?: boolean; icon: string; text: string }) {
  return (
    <div className="flex items-center gap-2.5 py-1">
      <div
        className="flex items-center justify-center shrink-0"
        style={{ width: 26, height: 26, borderRadius: 8, background: done ? "var(--ok-bg)" : "var(--bg)", color: done ? "var(--ok)" : "var(--muted)" }}
      >
        <Icon name={done ? "check" : icon} size={15} />
      </div>
      <span className="text-[0.8125rem]" style={{ color: done ? "var(--ink)" : "var(--muted)" }}>{text}</span>
    </div>
  );
}

function Done({ result, name, account, amount, me, onHome, onAgain }: { result: Result; name: string; account: string; amount: number; me: Me | null; onHome: () => void; onAgain: () => void }) {
  const over = !!result.overridden;
  const tone = over ? "warn" : "ok";
  const color = over ? "var(--warn)" : "var(--ok)";
  return (
    <div className="fade-in text-center pt-5">
      <div className="sonar-wrap mx-auto" style={{ width: 76, height: 76 }}>
        <span className="sonar-ring" style={{ borderColor: over ? "rgba(245,165,36,0.35)" : "rgba(62,207,142,0.35)" }} />
        <div className="flip-in flex items-center justify-center" style={{ width: 76, height: 76, borderRadius: 99, background: over ? "var(--warn-bg)" : "var(--ok-bg)", border: `1px solid ${over ? "var(--warn-line)" : "var(--ok-line)"}`, color }}>
          <Icon name="check-circle" size={44} />
        </div>
      </div>
      <div className="amount font-bold mt-3.5" style={{ fontSize: "1.5rem" }}>{naira(amount)} sent</div>
      <div className="text-sm" style={{ color: "var(--muted)" }}>to {name || "your recipient"}</div>

      <StatusCard tone={tone} className="mt-4 text-left">
        <div className="flex items-center gap-2 font-bold text-sm" style={{ color }}>
          <Icon name="shield-check" size={17} />
          {over ? "Sent, your call" : result.frictionless ? "Verified, straight through" : "Checked and sent"}
        </div>
        <p className="text-[0.8125rem] mt-1.5" style={{ color: "var(--muted)" }}>
          {over
            ? "You told us to send it, so we did. It's in the log, and we'll keep an eye on this account."
            : result.frictionless
              ? "You'd already proven it was you: your PIN and this device. That's enough for a normal transfer, so we didn't ask for an extra code on top."
              : "You cleared the extra check, so the money went out on the spot."}
        </p>
      </StatusCard>

      {result.ref && (
        <>
          <div className="text-xs mt-3" style={{ color: "var(--muted)" }}>
            Reference <span className="mono font-semibold" style={{ color: "var(--ink)" }}>{result.ref}</span>
          </div>
          {me && (
            <button
              className="btn btn-ghost btn-block mt-3"
              onClick={() =>
                downloadReceipt(
                  {
                    ref: result.ref!,
                    amount,
                    dir: "out",
                    counterparty: name || "Recipient",
                    account,
                    ts: Date.now(),
                    userName: me.name,
                    userAccount: maskAccount(me.accountNumber),
                  },
                  me.safeMode,
                )
              }
            >
              <Icon name="download" size={17} /> Download receipt
            </button>
          )}
        </>
      )}
      <button className="btn btn-primary btn-block mt-2" onClick={onHome}>Back to home</button>
      <button className="btn btn-ghost btn-block mt-2" onClick={onAgain}>Send another</button>
    </div>
  );
}
