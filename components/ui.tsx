import React from "react";
import { Icon } from "./icons";

export type Tone = "ok" | "warn" | "danger" | "info";

export const TONES: Record<Tone, { fg: string; bg: string; line: string }> = {
  ok: { fg: "var(--ok)", bg: "var(--ok-bg)", line: "var(--ok-line)" },
  warn: { fg: "var(--warn)", bg: "var(--warn-bg)", line: "var(--warn-line)" },
  danger: { fg: "var(--danger)", bg: "var(--danger-bg)", line: "var(--danger-line)" },
  info: { fg: "var(--brand-2)", bg: "var(--info-bg)", line: "var(--info-line)" },
};

/** Navy hero header with the sonar-ring texture — used by every non-home tab page. */
export function PageHeader({
  icon,
  title,
  subtitle,
  right,
}: {
  icon: string;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <header className="hero px-5 pt-5 pb-6">
      <div className="flex items-center gap-3">
        <span className="hero-icon">
          <Icon name={icon} size={18} />
        </span>
        <h1 className="display text-xl font-bold flex-1">{title}</h1>
        {right}
      </div>
      {subtitle && <p className="text-[0.8125rem] leading-snug text-white/70 mt-2">{subtitle}</p>}
    </header>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="section-label">{children}</div>;
}

/** Tinted card for status content (verdicts, alerts, network banners). */
export function StatusCard({
  tone,
  className = "",
  style,
  children,
}: {
  tone: Tone;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const t = TONES[tone];
  return (
    <div className={`card ${className}`} style={{ background: t.bg, borderColor: t.line, ...style }}>
      {children}
    </div>
  );
}

/** Icon in a rounded tinted square — list rows and quick actions. */
export function IconTile({ name, tone = "info", size = 42 }: { name: string; tone?: Tone; size?: number }) {
  const t = TONES[tone];
  return (
    <div
      className="flex items-center justify-center shrink-0"
      style={{ width: size, height: size, borderRadius: size * 0.29, background: t.bg, color: t.fg }}
    >
      <Icon name={name} size={Math.round(size * 0.5)} />
    </div>
  );
}

/** Bottom sheet anchored inside the phone shell. Drag the handle down to close. */
export function Sheet({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const drag = React.useRef({ startY: 0, delta: 0 });

  if (!open) return null;

  function onPointerDown(e: React.PointerEvent) {
    drag.current = { startY: e.clientY, delta: 0 };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current.startY) return;
    drag.current.delta = Math.max(0, e.clientY - drag.current.startY);
    if (ref.current) {
      ref.current.style.transform = `translateY(${drag.current.delta}px)`;
      ref.current.style.animation = "none";
    }
  }
  function onPointerUp() {
    const d = drag.current.delta;
    drag.current.startY = 0;
    // keep delta until the trailing click fires so a partial drag isn't a tap
    setTimeout(() => {
      drag.current.delta = 0;
    }, 0);
    if (d > 70) {
      onClose();
      return;
    }
    if (ref.current) ref.current.style.transform = "";
  }

  return (
    <div className="sheet-scrim fade-in" onClick={onClose}>
      <div ref={ref} className="sheet" role="dialog" aria-modal onClick={(e) => e.stopPropagation()}>
        <button
          className="sheet-grab"
          aria-label="Close"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onClick={(e) => {
            // a plain tap on the handle also closes; a partial drag does not
            if (drag.current.delta < 5) {
              e.stopPropagation();
              onClose();
            }
          }}
        >
          <span className="sheet-handle" />
        </button>
        {children}
      </div>
    </div>
  );
}

/** Shimmer loading placeholder. */
export function Skeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="card" style={{ borderColor: "transparent", background: "transparent", padding: 0 }}>
      <div className="flex flex-col gap-2.5">
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="skel" style={{ height: 14, width: `${100 - i * 18}%` }} />
        ))}
      </div>
    </div>
  );
}

/** Full-page loading state used while a page fetches its state. */
export function PageSkeleton() {
  return (
    <div className="p-4 flex flex-col gap-4" aria-busy>
      <div className="skel" style={{ height: 120 }} />
      <div className="skel" style={{ height: 64 }} />
      <div className="skel" style={{ height: 64 }} />
      <div className="skel" style={{ height: 180 }} />
    </div>
  );
}
