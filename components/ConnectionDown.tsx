"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "./icons";
import { logout } from "@/lib/client";

/* One of two faces of safe mode. When the coin lands here, the whole app plays
   dead: it looks like it simply can't reach the bank. A thug watching over the
   owner's shoulder usually loses patience with a broken app and leaves. Retry
   spins for a moment and fails again, so it never gives anything away. The real
   owner gets out by signing back in with their normal PIN once they're alone.
   The silent alarm already went out the moment the duress PIN was entered. */
export function ConnectionDown() {
  const router = useRouter();
  const [tries, setTries] = useState(0);
  const [busy, setBusy] = useState(false);

  function retry() {
    if (busy) return;
    setBusy(true);
    // Fake the round-trip, then "fail" again. Small variation so it feels real.
    setTimeout(() => {
      setBusy(false);
      setTries((n) => n + 1);
    }, 1400 + Math.random() * 900);
  }

  const line =
    tries === 0
      ? "We can't reach your account right now."
      : tries === 1
        ? "Still no connection. Give it a moment and try once more."
        : "The network's not cooperating. Check your data or Wi-Fi, then try again.";

  return (
    <div className="shell">
      <div className="scroll flex flex-col items-center justify-center text-center px-7" style={{ minHeight: "100%" }}>
        <div
          className="flex items-center justify-center mb-6"
          style={{ width: 78, height: 78, borderRadius: 24, background: "var(--surface-2)", border: "1px solid var(--line)", color: "#7a7a84" }}
        >
          <Icon name={busy ? "refresh" : "wifi"} size={38} className={busy ? "spin" : ""} />
        </div>

        <h1 className="display font-bold" style={{ fontSize: "1.375rem" }}>
          Connection lost
        </h1>
        <p className="text-sm mt-2" style={{ color: "var(--muted)", maxWidth: 280, lineHeight: 1.55 }}>
          {line}
        </p>

        <div className="mono text-xs mt-4" style={{ color: "#5c5c66" }}>
          Error SNT-0{tries + 2} · timed out
        </div>

        <button className="btn btn-primary btn-block mt-7" style={{ maxWidth: 300 }} disabled={busy} onClick={retry}>
          {busy ? "Reconnecting…" : "Try again"}
        </button>

        <button
          className="mt-4 text-[0.8125rem]"
          style={{ color: "var(--muted)", background: "transparent", border: "none", cursor: "pointer", minHeight: 40 }}
          onClick={() => { logout(); router.push("/"); }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
