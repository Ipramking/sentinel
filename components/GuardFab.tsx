"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Logo } from "./Logo";
import { Sheet } from "./ui";
import { ScamChecker } from "./ScamChecker";

const KEY = "sentinel.fab";
const MARGIN = 10;
const NAV_CLEARANCE = 84; // keep clear of the tab bar

/* Floating Sentinel assistant.
   - drag it anywhere (position remembered, snaps to the nearest edge)
   - long-press toggles a compact size
   - tap opens the quick scam check */
export function GuardFab() {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [small, setSmall] = useState(false);
  const [dragging, setDragging] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const drag = useRef({ dx: 0, dy: 0, moved: false, down: false, longPress: false, timer: 0 });

  const size = small ? 44 : 58;

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem(KEY) || "null");
      if (s) {
        if (s.pos) setPos(s.pos);
        setSmall(!!s.small);
      }
    } catch {}
  }, []);

  function shellRect() {
    return (btnRef.current?.offsetParent as HTMLElement | null)?.getBoundingClientRect();
  }

  function clamp(x: number, y: number, s = size) {
    const r = shellRect();
    if (!r) return { x, y };
    return {
      x: Math.min(Math.max(x, MARGIN), r.width - s - MARGIN),
      y: Math.min(Math.max(y, MARGIN), r.height - s - NAV_CLEARANCE),
    };
  }

  function save(p: { x: number; y: number } | null, sm: boolean) {
    localStorage.setItem(KEY, JSON.stringify({ pos: p, small: sm }));
  }

  function onPointerDown(e: React.PointerEvent) {
    const r = shellRect();
    const b = btnRef.current?.getBoundingClientRect();
    if (!r || !b) return;
    drag.current = {
      dx: e.clientX - b.left,
      dy: e.clientY - b.top,
      moved: false,
      down: true,
      longPress: false,
      timer: window.setTimeout(() => {
        // long-press: toggle compact size in place
        if (!drag.current.moved && drag.current.down) {
          drag.current.longPress = true;
          setSmall((s) => {
            save(pos, !s);
            return !s;
          });
          navigator.vibrate?.(20);
        }
      }, 480),
    };
    btnRef.current?.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current.down) return;
    const r = shellRect();
    if (!r) return;
    const next = clamp(e.clientX - r.left - drag.current.dx, e.clientY - r.top - drag.current.dy);
    if (!drag.current.moved) {
      const b = btnRef.current!.getBoundingClientRect();
      if (Math.abs(e.clientX - (b.left + drag.current.dx)) < 6 && Math.abs(e.clientY - (b.top + drag.current.dy)) < 6) return;
      drag.current.moved = true;
      window.clearTimeout(drag.current.timer);
      setDragging(true);
    }
    setPos(next);
  }

  function onPointerUp() {
    window.clearTimeout(drag.current.timer);
    const { moved, longPress } = drag.current;
    drag.current.down = false;
    setDragging(false);
    if (moved) {
      // snap to the nearest horizontal edge so it never floats mid-content
      setPos((p) => {
        if (!p) return p;
        const r = shellRect();
        const snapped = r ? { x: p.x + size / 2 < r.width / 2 ? MARGIN : r.width - size - MARGIN, y: p.y } : p;
        save(snapped, small);
        return snapped;
      });
      return;
    }
    if (!longPress) setOpen(true);
  }

  const style: React.CSSProperties = pos
    ? { left: pos.x, top: pos.y, width: size, height: size }
    : { right: 16, bottom: NAV_CLEARANCE, width: size, height: size };

  return (
    <>
      {!open && (
        <button
          ref={btnRef}
          className={"fab" + (dragging ? " dragging" : "")}
          style={{ ...style, opacity: dragging ? 1 : 0.94 }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          aria-label="Ask Sentinel — check a suspicious message. Drag to move, long-press to resize."
        >
          <span className="fab-halo" />
          <Logo size={small ? 28 : 36} />
        </button>
      )}
      <Sheet open={open} onClose={() => setOpen(false)}>
        <div className="flex items-center gap-2.5 mb-3">
          <div
            className="flex items-center justify-center shrink-0"
            style={{ width: 38, height: 38, borderRadius: 12, background: "var(--accent-bg)", color: "var(--accent)" }}
          >
            <Logo size={24} mono />
          </div>
          <div className="flex-1">
            <div className="display font-bold text-base">Ask Sentinel</div>
            <div className="text-xs" style={{ color: "var(--muted)" }}>Got a dodgy message? Check it here, no need to leave.</div>
          </div>
          <Link href="/scamguard" className="chip chip-muted" onClick={() => setOpen(false)}>
            Full view
          </Link>
        </div>
        <ScamChecker compact />
      </Sheet>
    </>
  );
}
