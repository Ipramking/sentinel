"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { api, getUserId, setUnlocked, setUserId } from "@/lib/client";

const DEMO_PROFILES: Record<string, { name: string; pin: string; duress: string; tag: string }> = {
  ada: { name: "Ada Okoro", pin: "1234", duress: "9111", tag: "Demo · primary" },
  bola: { name: "Bola Adeyemi", pin: "4321", duress: "9222", tag: "Demo · 2nd device" },
};

export default function SignIn() {
  const router = useRouter();
  const [mode, setMode] = useState<"profile" | "phone">("profile");
  const [sel, setSel] = useState("ada");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [expired, setExpired] = useState(false);
  // Timestamps of PIN-pad taps — their average gap is the behavioural rhythm signal.
  const taps = useRef<number[]>([]);

  useEffect(() => {
    const saved = getUserId();
    if (DEMO_PROFILES[saved]) setSel(saved);
    else setMode("phone");
    setUnlocked(false);
    if (new URLSearchParams(window.location.search).get("expired")) setExpired(true);
  }, []);

  function pickProfile(id: string) {
    setMode("profile");
    setSel(id);
    setUserId(id);
    setPin("");
    setError("");
  }

  async function submit(code: string) {
    setBusy(true);
    setError("");
    // mean gap between the 4 taps; undefined when typed too oddly to measure
    const ts = taps.current;
    const gaps = ts.slice(1).map((t, i) => t - ts[i]);
    const cadence =
      gaps.length === 3 ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : undefined;
    taps.current = [];
    try {
      const r =
        mode === "profile" ? await api.unlock(sel, code, cadence) : await api.unlockByPhone(phone, code, cadence);
      if (r.ok) {
        setUserId(r.userId);
        setUnlocked(true);
        router.push("/dashboard");
        return;
      }
      setError(
        r.mode === "no-account"
          ? "No account found for that phone number."
          : r.mode === "locked"
            ? `Too many tries. Wait ${r.retryInSeconds ?? 60}s and try again.`
            : "Incorrect PIN. Try again.",
      );
      setPin("");
    } catch {
      setError("Something went wrong. Try again.");
      setPin("");
    } finally {
      setBusy(false);
    }
  }

  function press(d: string) {
    if (busy) return;
    setError("");
    if (d === "del") {
      taps.current.pop();
      setPin((p) => p.slice(0, -1));
      return;
    }
    setPin((p) => {
      if (p.length >= 4) return p;
      taps.current.push(Date.now());
      const next = p + d;
      if (next.length === 4) setTimeout(() => submit(next), 120);
      return next;
    });
  }

  const p = DEMO_PROFILES[sel];
  const phoneReady = phone.replace(/\D/g, "").length === 11;
  const padEnabled = mode === "profile" || phoneReady;

  return (
    <div className="shell hero">
      <div className="scroll flex flex-col text-white px-5 pt-6 pb-7">
        {expired && (
          <div
            className="fade-in text-[0.78125rem] mb-4"
            style={{ background: "rgba(255,203,158,0.14)", border: "1px solid rgba(255,203,158,0.35)", borderRadius: 12, padding: "10px 12px", color: "rgba(255,255,255,0.88)" }}
            role="alert"
          >
            Your demo session timed out. Sign back in with a demo profile, your phone number, or open a fresh account.
          </div>
        )}
        {/* account switcher */}
        <div className="flex justify-center mb-7">
          <div className="flex gap-1 p-1 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}>
            {Object.entries(DEMO_PROFILES).map(([id, pr]) => (
              <button
                key={id}
                onClick={() => pickProfile(id)}
                className="chip"
                style={{
                  background: mode === "profile" && sel === id ? "rgba(255,255,255,0.95)" : "transparent",
                  color: mode === "profile" && sel === id ? "var(--brand)" : "rgba(255,255,255,0.8)",
                  padding: "8px 12px",
                  cursor: "pointer",
                  border: "none",
                }}
              >
                {pr.name.split(" ")[0]}
              </button>
            ))}
            <button
              onClick={() => { setMode("phone"); setPin(""); setError(""); }}
              className="chip"
              style={{
                background: mode === "phone" ? "rgba(255,255,255,0.95)" : "transparent",
                color: mode === "phone" ? "var(--brand)" : "rgba(255,255,255,0.8)",
                padding: "8px 12px",
                cursor: "pointer",
                border: "none",
              }}
            >
              My account
            </button>
          </div>
        </div>

        {/* mark + wordmark, sonar quietly scanning behind the shield */}
        <div className="flex flex-col items-center">
          <div className="sonar-wrap" style={{ width: 72, height: 72 }}>
            <span className="sonar-ring" />
            <span className="sonar-ring r2" />
            <span className="float3d">
              <Logo size={72} />
            </span>
          </div>
          <h1 className="display font-bold mt-3.5" style={{ fontSize: "1.875rem" }}>
            Sentinel
          </h1>
          <p className="text-[0.8125rem] mt-0.5" style={{ color: "rgba(255,255,255,0.66)" }}>
            Security that disappears when you&rsquo;re you
          </p>
        </div>

        {mode === "profile" ? (
          <div className="text-center mt-6">
            <div className="text-[0.9375rem] font-semibold">Hello, {p.name.split(" ")[0]}</div>
            <div className="text-[0.8125rem]" style={{ color: "rgba(255,255,255,0.6)" }}>
              Enter your 4-digit PIN · {p.tag}
            </div>
          </div>
        ) : (
          <div className="mt-6 mx-auto w-full" style={{ maxWidth: 300 }}>
            <label className="block text-[0.8125rem] mb-1.5 text-center" style={{ color: "rgba(255,255,255,0.7)" }}>
              Sign in with your phone number
            </label>
            <input
              className="input mono text-center"
              style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.25)", color: "#fff" }}
              inputMode="numeric"
              maxLength={11}
              value={phone}
              onChange={(e) => { setPhone(e.target.value.replace(/\D/g, "")); setError(""); }}
              placeholder="080X XXX XXXX"
            />
            <div className="text-center text-[0.75rem] mt-1.5" style={{ color: "rgba(255,255,255,0.55)" }}>
              {phoneReady ? "Now enter your 4-digit PIN" : "Then your PIN on the pad below"}
            </div>
          </div>
        )}

        <div className="flex justify-center gap-4 mt-5 mb-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={"pindot" + (i < pin.length ? " on" : "")} />
          ))}
        </div>
        <div className="text-center text-[0.8125rem] font-semibold" style={{ height: 20, color: "#ffb4c4" }} role="alert">
          {error}
        </div>

        <div className="pinpad mt-2" style={{ opacity: padEnabled ? 1 : 0.4 }}>
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
            <button key={d} className="pinkey" disabled={!padEnabled} onClick={() => press(d)}>
              {d}
            </button>
          ))}
          <div />
          <button className="pinkey" disabled={!padEnabled} onClick={() => press("0")}>
            0
          </button>
          <button className="pinkey" disabled={!padEnabled} onClick={() => press("del")} style={{ fontSize: "1.25rem" }} aria-label="Delete digit">
            ⌫
          </button>
        </div>

        <div className="mt-auto pt-5">
          <Link
            href="/signup"
            className="block text-center text-[0.8125rem] font-semibold py-3"
            style={{ color: "#fff", background: "rgba(255,255,255,0.1)", borderRadius: 14, border: "1px solid rgba(255,255,255,0.18)" }}
          >
            New to Sentinel? Open an account
          </Link>

          {mode === "profile" && (
            <>
              <button
                onClick={() => setShowHint((s) => !s)}
                className="w-full text-xs mt-1"
                style={{ minHeight: 40, color: "rgba(255,255,255,0.55)", background: "transparent", border: "none", cursor: "pointer" }}
              >
                {showHint ? "Hide demo PINs" : "Show demo PINs"}
              </button>
              {showHint && (
                <div
                  className="fade-in text-[0.78125rem]"
                  style={{ background: "rgba(255,255,255,0.08)", borderRadius: 14, padding: "12px 14px", color: "rgba(255,255,255,0.82)" }}
                >
                  <div className="flex justify-between gap-3">
                    <span>Normal PIN (your real account)</span>
                    <span className="mono font-bold">{p.pin}</span>
                  </div>
                  <div className="flex justify-between gap-3 mt-1.5" style={{ color: "#ffcf9e" }}>
                    <span>Duress PIN (fake screen, silent alarm)</span>
                    <span className="mono font-bold">{p.duress}</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
