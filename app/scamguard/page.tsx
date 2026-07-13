"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { IconTile, PageHeader, SectionLabel } from "@/components/ui";
import { ScamChecker } from "@/components/ScamChecker";
import { api, getUserId } from "@/lib/client";

type AiEngine = "auto" | "gemini" | "core";
type CoreStats = { examples: number; communityReports: number; updatedAt: number };

const ENGINES: { id: AiEngine; icon: string; title: string; desc: string }[] = [
  { id: "auto", icon: "radar", title: "Auto (recommended)", desc: "Gemini in the cloud, with on-device rules ready to step in if the network drops." },
  { id: "gemini", icon: "cloud", title: "Gemini 2.5 Flash", desc: "Google's cloud model. Reads screenshots as well as text." },
  { id: "core", icon: "cpu", title: "Sentinel Core", desc: "Ours. It runs on the bank's side, keeps your messages in-house, and picks up every scam the community reports." },
];

export default function ScamGuard() {
  const uid = typeof window !== "undefined" ? getUserId() : "ada";
  const [engine, setEngine] = useState<AiEngine>("auto");
  const [core, setCore] = useState<CoreStats>({ examples: 0, communityReports: 0, updatedAt: 0 });

  useEffect(() => {
    api.engine(uid).then((r) => {
      if (r.aiEngine) setEngine(r.aiEngine);
      if (r.core) setCore(r.core);
    }).catch(() => {});
  }, [uid]);

  async function pickEngine(id: AiEngine) {
    setEngine(id);
    await api.setAiEngine(uid, id);
  }

  return (
    <AppShell active="/scamguard">
      <PageHeader
        icon="shield-check"
        title="ScamGuard"
        subtitle="Got a message you're not sure about? Paste it or drop a screenshot. Our AI reads it and tells you if it's a scam before you lose a naira."
      />
      <div className="p-4 fade-in">
        <ScamChecker />

        {/* AI engine */}
        <div className="mt-5">
          <SectionLabel>AI engine</SectionLabel>
          <div className="card" style={{ padding: 4 }}>
            {ENGINES.map((e, i) => {
              const on = engine === e.id;
              return (
                <div key={e.id}>
                  <button
                    className="w-full flex items-center gap-3 text-left"
                    style={{ padding: "12px 10px", background: "transparent", border: "none", cursor: "pointer" }}
                    onClick={() => pickEngine(e.id)}
                    aria-pressed={on}
                  >
                    <IconTile name={e.icon} tone="info" size={38} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold flex items-center gap-2">
                        {e.title}
                        {on && <span className="chip chip-brand" style={{ fontSize: "0.625rem", padding: "2px 8px" }}>Active</span>}
                      </div>
                      <div className="text-xs" style={{ color: "var(--muted)" }}>{e.desc}</div>
                    </div>
                    <span
                      className="shrink-0"
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 99,
                        border: on ? "6px solid var(--brand-2)" : "2px solid var(--line)",
                        transition: "border .15s ease",
                      }}
                    />
                  </button>
                  {i < ENGINES.length - 1 && <div className="divider" style={{ margin: "0 10px" }} />}
                </div>
              );
            })}
          </div>
          <p className="text-xs mt-2 px-1" style={{ color: "var(--muted)" }}>
            Sentinel Core has learned from {core.examples} message{core.examples === 1 ? "" : "s"} so far
            {core.communityReports > 0 ? `, ${core.communityReports} of them reported by people like you` : ""}. Every
            community report and every confident cloud verdict makes it sharper.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
