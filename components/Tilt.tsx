"use client";

import { useRef } from "react";

/* Pointer-tracked 3D tilt with a moving glare — the balance card feels like a
   physical object. Degrades to nothing under prefers-reduced-motion. */
export function Tilt({
  children,
  max = 7,
  className = "",
  style,
}: {
  children: React.ReactNode;
  max?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);

  function move(e: React.PointerEvent) {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    const px = Math.min(Math.max((e.clientX - r.left) / r.width, 0), 1);
    const py = Math.min(Math.max((e.clientY - r.top) / r.height, 0), 1);
    el.style.transform = `perspective(1000px) rotateX(${((0.5 - py) * max).toFixed(2)}deg) rotateY(${((px - 0.5) * max * 1.15).toFixed(2)}deg)`;
    el.style.setProperty("--gx", `${(px * 100).toFixed(1)}%`);
    el.style.setProperty("--gy", `${(py * 100).toFixed(1)}%`);
    el.classList.add("on");
  }

  function reset() {
    const el = ref.current;
    if (!el) return;
    el.style.transform = "";
    el.classList.remove("on");
  }

  return (
    <div
      ref={ref}
      className={`tilt ${className}`}
      style={style}
      onPointerMove={move}
      onPointerLeave={reset}
      onPointerCancel={reset}
      onPointerUp={reset}
    >
      {children}
      <span className="glare" />
    </div>
  );
}
