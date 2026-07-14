"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Icon } from "@/components/icons";
import { IconTile, PageSkeleton } from "@/components/ui";
import { api, getUserId } from "@/lib/client";
import { clockTime } from "@/lib/format";

type Decision = { id: string; kind: string; title: string; outcome: string; reason: string; dataUsed: string[]; ts: number };

const OUTCOME: Record<string, { label: string; cls: string }> = {
  allowed: { label: "Allowed", cls: "chip-ok" },
  review: { label: "Step-up", cls: "chip-warn" },
  blocked: { label: "Blocked", cls: "chip-danger" },
  override: { label: "You overrode", cls: "chip-warn" },
  safe: { label: "Safe mode", cls: "chip-brand" },
  alert: { label: "Network", cls: "chip-brand" },
};

const KIND_ICON: Record<string, string> = {
  transfer: "send",
  scam: "shield-check",
  unlock: "lock",
  report: "flag",
};

/** Turn a timestamp into a friendly day heading: Today, Yesterday, or a date. */
function dayLabel(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(d, today)) return "Today";
  if (same(d, yest)) return "Yesterday";
  return d.toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "long" });
}

export default function DecisionLog() {
  const uid = typeof window !== "undefined" ? getUserId() : "ada";
  const [decisions, setDecisions] = useState<Decision[] | null>(null);

  const load = useCallback(() => {
    api.trustLog(uid).then((r) => setDecisions(r.decisions)).catch(() => setDecisions([]));
  }, [uid]);
  useEffect(() => { load(); }, [load]);

  // Bucket the entries under day headings, newest first.
  const groups: { day: string; items: Decision[] }[] = [];
  for (const d of decisions ?? []) {
    const day = dayLabel(d.ts);
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.items.push(d);
    else groups.push({ day, items: [d] });
  }

  return (
    <AppShell active="/trust">
      <header className="hero px-5 pt-5 pb-6">
        <div className="flex items-center gap-3">
          <Link href="/trust" className="icon-btn" style={{ color: "var(--ink)", background: "rgba(255,255,255,0.06)", border: "1px solid var(--line)" }} aria-label="Back to Trust Center">
            <Icon name="chevron" size={18} style={{ transform: "rotate(180deg)" }} />
          </Link>
          <div>
            <h1 className="display text-xl font-bold">Decision log</h1>
            <p className="text-[0.8125rem] mt-0.5" style={{ color: "var(--muted)" }}>
              Every call Sentinel made on your account, and why.
            </p>
          </div>
        </div>
      </header>

      <div className="p-4 fade-in">
        {decisions === null ? (
          <PageSkeleton />
        ) : decisions.length === 0 ? (
          <div className="card text-center" style={{ padding: "30px 18px" }}>
            <IconTile name="doc" tone="info" size={44} />
            <div className="font-semibold text-sm" style={{ marginTop: 12 }}>Nothing here yet</div>
            <div className="text-[0.8125rem] mt-1" style={{ color: "var(--muted)" }}>
              Send some money or run a scam check. Whatever Sentinel decides shows up here, spelled out.
            </div>
          </div>
        ) : (
          groups.map((g) => (
            <div key={g.day} className="mb-5">
              <div className="section-label" style={{ position: "sticky", top: 0 }}>{g.day}</div>
              <div className="flex flex-col gap-2">
                {g.items.map((d) => {
                  const o = OUTCOME[d.outcome] || OUTCOME.allowed;
                  return (
                    <div key={d.id} className="card">
                      <div className="flex items-start gap-3">
                        <IconTile name={KIND_ICON[d.kind] || "info"} tone="info" size={38} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="font-semibold text-sm flex-1">{d.title}</div>
                            <span className={"chip " + o.cls}>{o.label}</span>
                          </div>
                          <div className="text-[0.8125rem] mt-1.5" style={{ color: "var(--muted)", lineHeight: 1.5 }}>{d.reason}</div>
                          {d.dataUsed.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2.5">
                              {d.dataUsed.map((x) => (
                                <span key={x} className="chip chip-muted" style={{ fontSize: "0.65625rem" }}>{x}</span>
                              ))}
                            </div>
                          )}
                          <div className="flex items-center gap-1.5 mt-2.5 text-[0.6875rem]" style={{ color: "#5c5c66" }}>
                            <Icon name="clock" size={12} />
                            <span className="mono">{clockTime(d.ts)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </AppShell>
  );
}
