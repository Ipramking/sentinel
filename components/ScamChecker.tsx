"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "./icons";
import { StatusCard, TONES, type Tone } from "./ui";
import { api, getUserId } from "@/lib/client";

const SCAM_ACCOUNT = "3388776655";

const SAMPLE =
  "Dear Customer, your account has been TEMPORARILY BLOCKED due to a failed BVN update. To reactivate, transfer the ₦180,000 verification fee to account 3388776655 (Acct Verification Team) within 30 minutes or your account will be permanently deactivated. Reply with your OTP to confirm.";

type Verdict = {
  verdict: "scam" | "suspicious" | "safe";
  confidence: number;
  redFlags: string[];
  advice: string;
  source: "gemini" | "fallback" | "core";
};

const VERDICT_TONE: Record<Verdict["verdict"], Tone> = { scam: "danger", suspicious: "warn", safe: "ok" };

// Icon-over-label so each input button owns an equal third and never overflows on phones.
const INPUT_BTN: React.CSSProperties = {
  flexDirection: "column",
  gap: 5,
  minWidth: 0,
  minHeight: 60,
  padding: "9px 6px",
  fontSize: "0.75rem",
  lineHeight: 1.15,
  fontWeight: 600,
  textAlign: "center",
};

const SOURCE_LABEL: Record<Verdict["source"], string> = {
  gemini: "Read by Gemini AI",
  core: "Read by Sentinel Core, our own model",
  fallback: "Read on your device",
};

/** The ScamGuard checker. */
export function ScamChecker({ compact = false }: { compact?: boolean }) {
  const uid = typeof window !== "undefined" ? getUserId() : "ada";
  const fileRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [imgB64, setImgB64] = useState("");
  const [imgMime, setImgMime] = useState("image/png");
  const [imgPreview, setImgPreview] = useState("");
  const [audB64, setAudB64] = useState("");
  const [audMime, setAudMime] = useState("audio/ogg");
  const [audPreview, setAudPreview] = useState("");
  const [account, setAccount] = useState(SCAM_ACCOUNT);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [busy, setBusy] = useState(false);
  const [reported, setReported] = useState(false);
  const [netReports, setNetReports] = useState(0);

  useEffect(() => {
    api.state(uid).then((s) => setNetReports(s.network.reports)).catch(() => {});
  }, [uid]);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      setImgPreview(url);
      const [meta, b64] = url.split(",");
      setImgMime(meta.match(/data:(.*?);/)?.[1] || "image/png");
      setImgB64(b64 || "");
      // one attachment at a time keeps the request simple
      setAudB64("");
      setAudPreview("");
    };
    reader.readAsDataURL(f);
  }

  function onAudio(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      setAudPreview(url);
      const [meta, b64] = url.split(",");
      setAudMime(meta.match(/data:(.*?);/)?.[1] || "audio/ogg");
      setAudB64(b64 || "");
      setImgB64("");
      setImgPreview("");
    };
    reader.readAsDataURL(f);
  }

  async function check() {
    setBusy(true);
    setVerdict(null);
    setReported(false);
    try {
      const r = await api.scamCheck({
        userId: uid,
        text: text || undefined,
        imageBase64: imgB64 || undefined,
        audioBase64: audB64 || undefined,
        mimeType: imgB64 ? imgMime : audB64 ? audMime : undefined,
      });
      setVerdict(r.verdict);
    } finally {
      setBusy(false);
    }
  }

  async function report() {
    setBusy(true);
    try {
      // Pass the message too — every report teaches Sentinel Core.
      await api.report(uid, account, "Reported scam account", undefined, text || undefined);
      const s = await api.state(uid);
      setNetReports(s.network.reports);
      setReported(true);
    } finally {
      setBusy(false);
    }
  }

  const hasInput = !!text.trim() || !!imgB64 || !!audB64;
  const tone = verdict ? VERDICT_TONE[verdict.verdict] : "info";
  const vColor = TONES[tone].fg;

  return (
    <div>
      <div className={compact ? "" : "card"}>
        <label className="label">Paste the message</label>
        <textarea
          className="input"
          style={{ minHeight: compact ? 76 : 96, resize: "vertical", lineHeight: 1.4 }}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder='e.g. "Your account has been blocked, transfer ₦… to reactivate"'
        />
        <div className="grid grid-cols-3 gap-2 mt-2.5">
          <button className="btn btn-ghost" style={INPUT_BTN} onClick={() => fileRef.current?.click()}>
            <Icon name="image" size={18} /> Screenshot
          </button>
          <button className="btn btn-ghost" style={INPUT_BTN} onClick={() => audioRef.current?.click()}>
            <Icon name="mic" size={18} /> Voice note
          </button>
          <button className="btn btn-ghost" style={INPUT_BTN} onClick={() => setText(SAMPLE)}>
            <Icon name="doc" size={18} /> Sample
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
          <input ref={audioRef} type="file" accept="audio/*" hidden onChange={onAudio} />
        </div>

        {audPreview && (
          <div className="flex items-center gap-2 mt-2.5">
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <audio controls src={audPreview} style={{ flex: 1, height: 40 }} />
            <button
              className="icon-btn"
              onClick={() => { setAudB64(""); setAudPreview(""); }}
              style={{ background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: 99 }}
              aria-label="Remove voice note"
            >
              <Icon name="x" size={16} />
            </button>
          </div>
        )}

        {imgPreview && (
          <div className="relative mt-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imgPreview} alt="Uploaded screenshot" style={{ width: "100%", borderRadius: 12, border: "1px solid var(--line)", maxHeight: compact ? 160 : undefined, objectFit: "cover" }} />
            <button
              className="icon-btn"
              onClick={() => { setImgB64(""); setImgPreview(""); }}
              style={{ position: "absolute", top: 4, right: 4, background: "rgba(6,16,35,0.65)", color: "#fff", borderRadius: 99 }}
              aria-label="Remove screenshot"
            >
              <Icon name="x" size={16} />
            </button>
          </div>
        )}
      </div>

      <button className="btn btn-primary btn-block mt-3.5" disabled={!hasInput || busy} onClick={check}>
        <Icon name="shield-check" size={18} /> {busy ? "Analysing…" : "Check for scam"}
      </button>

      {verdict && (
        <div className="fade-in mt-4">
          <StatusCard tone={tone}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2" style={{ color: vColor }}>
                <Icon name={verdict.verdict === "safe" ? "check-circle" : "alert"} size={26} />
                <div className="display font-bold text-xl capitalize">{verdict.verdict}</div>
              </div>
              <div className="text-right">
                <div className="text-[0.6875rem]" style={{ color: "var(--muted)" }}>Confidence</div>
                <div className="amount font-bold" style={{ color: vColor }}>{verdict.confidence}%</div>
              </div>
            </div>

            <div className="mt-3">
              <div className="section-label" style={{ margin: "0 0 6px" }}>Why</div>
              <div className="flex flex-col gap-2">
                {verdict.redFlags.map((f, i) => (
                  <div key={i} className="flex gap-2 items-start text-sm">
                    <span className="shrink-0" style={{ color: vColor, marginTop: 1 }}>
                      <Icon name={verdict.verdict === "safe" ? "check" : "alert"} size={15} />
                    </span>
                    {f}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-3 text-[0.8125rem]" style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, padding: "10px 12px" }}>
              <b>What to do:</b> {verdict.advice}
            </div>

            <div className="mt-2.5">
              <span className={verdict.source === "core" ? "chip chip-accent" : "chip chip-brand"} style={{ fontSize: "0.6875rem" }}>
                <Icon name={verdict.source === "gemini" ? "cloud" : "cpu"} size={12} /> {SOURCE_LABEL[verdict.source]}
              </span>
            </div>
          </StatusCard>

          {verdict.verdict !== "safe" && (
            <div className="card mt-3">
              {!reported ? (
                <>
                  <div className="font-bold text-sm">Shut it down for everyone</div>
                  <p className="text-[0.78125rem] mt-1 mb-2.5" style={{ color: "var(--muted)" }}>
                    Drop in the account this message wanted you to pay. Everyone else on Sentinel gets covered right away, and it teaches our own AI too.
                  </p>
                  <label className="label">Account it wanted you to pay</label>
                  <input className="input mono" value={account} onChange={(e) => setAccount(e.target.value.replace(/\D/g, ""))} />
                  <button className="btn btn-danger btn-block mt-2.5" disabled={busy || account.length < 4} onClick={report}>
                    {busy ? "Reporting…" : "Report it"}
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2 font-semibold text-sm" style={{ color: "var(--ok)" }}>
                  <Icon name="users" size={18} />
                  Done. That's {netReports} scam account{netReports === 1 ? "" : "s"} nobody on Sentinel can pay now.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {!compact && (
        <p className="text-center text-xs mt-4" style={{ color: "var(--muted)" }}>
          {netReports} scam account{netReports === 1 ? "" : "s"} shut out across Sentinel right now
        </p>
      )}
    </div>
  );
}
