import React from "react";

/* The Sentinel mark — a solid shield holding a radar signal: the network,
   quietly watching. Filled geometry (not an outline icon) so it reads as a
   brand, not a UI glyph. `mono` renders it single-colour for tinted surfaces. */
export function Logo({ size = 64, mono = false }: { size?: number; mono?: boolean }) {
  const id = React.useId();
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden>
      {!mono && (
        <defs>
          <linearGradient id={`${id}-g`} x1="10" y1="4" x2="38" y2="46" gradientUnits="userSpaceOnUse">
            <stop stopColor="#ffffff" />
            <stop offset="0.5" stopColor="#dfe1e8" />
            <stop offset="1" stopColor="#a9adbb" />
          </linearGradient>
        </defs>
      )}
      <path
        d="M24 3.5 40 9.4v12.2c0 10-6.8 17-16 19.9C14.8 38.6 8 31.6 8 21.6V9.4L24 3.5Z"
        fill={mono ? "currentColor" : `url(#${id}-g)`}
      />
      {/* top light-catch */}
      {!mono && <path d="M24 3.5 40 9.4v2.2L24 5.8 8 11.6V9.4L24 3.5Z" fill="#ffffff" fillOpacity="0.6" />}
      {/* radar signal, inked into the silver */}
      <path
        d="M15.6 20.2a11.9 11.9 0 0 1 16.8 0"
        stroke={mono ? "#ffffff" : "#111114"}
        strokeWidth="2.6"
        strokeLinecap="round"
        opacity={mono ? 0.75 : 0.88}
      />
      <path
        d="M19.6 24.6a6.2 6.2 0 0 1 8.8 0"
        stroke={mono ? "#ffffff" : "#111114"}
        strokeWidth="2.6"
        strokeLinecap="round"
        opacity={mono ? 0.9 : 0.88}
      />
      <circle cx="24" cy="30" r="3.1" fill={mono ? "#ffffff" : "#0aa4d0"} />
    </svg>
  );
}
