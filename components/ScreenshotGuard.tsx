"use client";

import { useEffect, useState } from "react";
import { Icon } from "./icons";
import { getSafeMode } from "@/lib/client";

/* Active only while the duress decoy is showing. A coerced screen must not leave
   the phone as "proof of payment":
   - PrintScreen instantly blanks the display and scrubs the clipboard
   - anything printed / saved-to-PDF gets the CSS FAKE watermark (html.duress)
   The native app build uses FLAG_SECURE for the same effect on mobile. */
export function ScreenshotGuard() {
  const [active, setActive] = useState(false);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    setActive(getSafeMode());
    const onMode = (e: Event) => setActive(!!(e as CustomEvent).detail);
    window.addEventListener("sentinel-mode", onMode);
    return () => window.removeEventListener("sentinel-mode", onMode);
  }, []);

  useEffect(() => {
    if (!active) return;
    document.documentElement.classList.add("duress");
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "PrintScreen") {
        setFlash(true);
        navigator.clipboard?.writeText(" ").catch(() => {});
        setTimeout(() => setFlash(false), 1600);
      }
    };
    window.addEventListener("keyup", onKey);
    return () => {
      document.documentElement.classList.remove("duress");
      window.removeEventListener("keyup", onKey);
    };
  }, [active]);

  if (!active || !flash) return null;
  return (
    <div className="shot-block" role="alert">
      <Icon name="shield" size={40} />
      <div className="font-bold">Screen capture blocked</div>
      <div className="text-sm" style={{ opacity: 0.7, maxWidth: 280 }}>
        Sentinel prevents screenshots of banking screens.
      </div>
    </div>
  );
}
