"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Icon } from "@/components/icons";
import { IconTile, PageHeader, SectionLabel, StatusCard } from "@/components/ui";
import { api, getUserId, logout, setUnlocked } from "@/lib/client";
import { clockTime, naira, timeAgo } from "@/lib/format";

type Decision = { id: string; kind: string; title: string; outcome: string; reason: string; dataUsed: string[]; ts: number };
type Alert = { id: string; kind: string; message: string; ts: number };
type Toggles = { spendingHistory: boolean; deviceSignals: boolean; networkFeed: boolean };
type AiEngine = "auto" | "gemini" | "core";
type CoreStats = { examples: number; communityReports: number; updatedAt: number };
type GAlert = { id: string; wardId: string; wardName: string; amount: number; name: string; risk: string; status: string; holdUntil?: number; ts: number };
type GuardianInfo = { myGuardian: { name: string; phone: string } | null; wards: { id: string; name: string }[]; alerts: GAlert[] };

const ENGINES: { id: AiEngine; icon: string; title: string; desc: string }[] = [
  { id: "auto", icon: "radar", title: "Auto (recommended)", desc: "Gemini in the cloud, with Sentinel Core ready to step in if the network drops." },
  { id: "gemini", icon: "cloud", title: "Gemini 2.5 Flash", desc: "Google's cloud model. Reads screenshots as well as text." },
  { id: "core", icon: "cpu", title: "Sentinel Core", desc: "Ours. It runs on the bank's side, keeps your messages in-house, and picks up every scam the community reports." },
];

const OUTCOME: Record<string, { label: string; cls: string }> = {
  allowed: { label: "Allowed", cls: "chip-ok" },
  review: { label: "Step-up", cls: "chip-warn" },
  blocked: { label: "Blocked", cls: "chip-danger" },
  override: { label: "Your override", cls: "chip-warn" },
  safe: { label: "Safe mode", cls: "chip-brand" },
  alert: { label: "Network", cls: "chip-brand" },
};

const TOGGLE_META: { key: keyof Toggles; title: string; desc: string }[] = [
  { key: "spendingHistory", title: "Spending history", desc: "Lets us catch a brand-new payee or an amount bigger than you usually send." },
  { key: "deviceSignals", title: "Device & time signals", desc: "Lets us notice an odd hour or a phone we haven't seen before." },
  { key: "networkFeed", title: "Network threat feed", desc: "Blocks accounts other people have already reported as scams." },
];

export default function Trust() {
  const router = useRouter();
  const uid = typeof window !== "undefined" ? getUserId() : "ada";
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [toggles, setToggles] = useState<Toggles>({ spendingHistory: true, deviceSignals: true, networkFeed: true });
  const [net, setNet] = useState({ reports: 0, protectedUsers: 0 });
  const [engine, setEngine] = useState<AiEngine>("auto");
  const [core, setCore] = useState<CoreStats>({ examples: 0, communityReports: 0, updatedAt: 0 });
  const [guard, setGuard] = useState<GuardianInfo>({ myGuardian: null, wards: [], alerts: [] });
  const [gPhone, setGPhone] = useState("");
  const [gError, setGError] = useState("");
  const [gBusy, setGBusy] = useState(false);

  const load = useCallback(() => {
    api.guardian(uid).then(setGuard).catch(() => {});
    api.trustLog(uid).then((r) => {
      setDecisions(r.decisions);
      setAlerts(r.alerts);
      setToggles(r.toggles);
      if (r.aiEngine) setEngine(r.aiEngine);
      if (r.core) setCore(r.core);
    }).catch(() => {});
    api.state(uid).then((s) => setNet(s.network)).catch(() => {});
  }, [uid]);

  useEffect(() => { load(); }, [load]);

  async function flip(key: keyof Toggles) {
    const next = !toggles[key];
    setToggles((t) => ({ ...t, [key]: next }));
    await api.setToggle(uid, key, next);
  }

  async function pickEngine(id: AiEngine) {
    setEngine(id);
    await api.setAiEngine(uid, id);
  }

  async function setGuardian() {
    setGBusy(true);
    setGError("");
    try {
      const r = await api.guardianSet(uid, gPhone);
      if (!r.ok) {
        setGError(r.error || "Couldn't set that guardian.");
        return;
      }
      setGPhone("");
      load();
    } finally {
      setGBusy(false);
    }
  }

  async function removeGuardian() {
    await api.guardianRemove(uid);
    load();
  }

  async function actOnAlert(action: "hold" | "release" | "clear", alertId: string) {
    setGBusy(true);
    try {
      await api.guardianAct(uid, action, alertId);
      load();
    } finally {
      setGBusy(false);
    }
  }

  async function resetDemo() {
    await api.reset();
    setUnlocked(false);
    router.push("/");
  }

  return (
    <AppShell active="/trust">
      <PageHeader
        icon="lock"
        title="Trust Center"
        subtitle="We don't touch your data quietly. Every call we make is written down here, and you decide what we're allowed to look at."
      />

      <div className="p-4 fade-in">
        {/* network */}
        <StatusCard tone="ok" className="flex items-center gap-3">
          <IconTile name="users" tone="ok" size={44} />
          <div>
            <div className="font-bold">Network protection</div>
            <div className="text-[0.78125rem]" style={{ color: "var(--muted)" }}>
              {net.protectedUsers} people covered. {net.reports} scam account{net.reports === 1 ? "" : "s"} shut out for all of them.
            </div>
          </div>
        </StatusCard>

        {/* alerts */}
        {alerts.length > 0 && (
          <div className="mt-4">
            <SectionLabel>Security alerts</SectionLabel>
            <div className="flex flex-col gap-2">
              {alerts.map((a) => (
                <StatusCard key={a.id} tone={a.kind === "duress" ? "warn" : "info"}>
                  <div className="flex items-center gap-2 font-bold text-[0.8125rem]" style={{ color: a.kind === "duress" ? "var(--warn)" : "var(--brand-2)" }}>
                    <Icon name={a.kind === "duress" ? "alert" : "shield-check"} size={16} />
                    {a.kind === "duress" ? "Duress alert" : a.kind === "guardian" ? "Guardian" : "Report filed"}
                    <span className="ml-auto font-normal text-[0.6875rem]" style={{ color: "var(--muted)" }}>{timeAgo(a.ts)}</span>
                  </div>
                  <div className="text-[0.78125rem] mt-1" style={{ color: "var(--muted)" }}>{a.message}</div>
                </StatusCard>
              ))}
            </div>
          </div>
        )}

        {/* data controls */}
        <div className="mt-4">
          <SectionLabel>Your data, your controls</SectionLabel>
          <div className="card" style={{ padding: 4 }}>
            {TOGGLE_META.map((m, i) => (
              <div key={m.key}>
                <div className="flex items-center gap-3" style={{ padding: "12px 10px" }}>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{m.title}</div>
                    <div className="text-xs" style={{ color: "var(--muted)" }}>{m.desc}</div>
                  </div>
                  <Switch on={toggles[m.key]} onClick={() => flip(m.key)} label={m.title} />
                </div>
                {i < TOGGLE_META.length - 1 && <div className="divider" style={{ margin: "0 10px" }} />}
              </div>
            ))}
          </div>
          <p className="text-xs mt-2 px-1" style={{ color: "var(--muted)" }}>
            Switch one off and we stop reading it, so the checks it feeds go quiet too. Whatever we learn stays here to keep you safe. We never sell it.
          </p>
        </div>

        {/* AI engine */}
        <div className="mt-3">
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
            Sentinel Core has studied <b>{core.examples}</b> messages so far, <b>{core.communityReports}</b> of
            them flagged by people like you. Every report you send makes it sharper for the next person.
          </p>
        </div>

        {/* guardian mode */}
        <div className="mt-3">
          <SectionLabel>Guardian</SectionLabel>

          <div className="card">
            {guard.myGuardian ? (
              <div className="flex items-center gap-3">
                <IconTile name="users" tone="info" size={40} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold">{guard.myGuardian.name} watches out for you</div>
                  <div className="text-xs" style={{ color: "var(--muted)" }}>
                    They hear about unusual attempts and can pause them. They can't see your balance or touch your money.
                  </div>
                </div>
                <button className="chip chip-muted" style={{ cursor: "pointer" }} onClick={removeGuardian}>
                  Remove
                </button>
              </div>
            ) : (
              <>
                <div className="text-sm font-semibold">Add a guardian</div>
                <p className="text-xs mt-1 mb-2.5" style={{ color: "var(--muted)" }}>
                  Pick someone you trust who also uses Sentinel. If you ever try something unusual, they get a heads-up
                  and can press pause. Delay only — they never see your money.
                </p>
                <div className="flex gap-2">
                  <input
                    className="input mono flex-1"
                    inputMode="numeric"
                    maxLength={11}
                    value={gPhone}
                    onChange={(e) => { setGPhone(e.target.value.replace(/\D/g, "")); setGError(""); }}
                    placeholder="Their phone number"
                  />
                  <button className="btn btn-primary" style={{ minHeight: 48, padding: "10px 18px" }} disabled={gBusy || gPhone.length !== 11} onClick={setGuardian}>
                    Add
                  </button>
                </div>
                {gError && (
                  <div className="text-xs font-semibold mt-2" style={{ color: "var(--danger)" }} role="alert">{gError}</div>
                )}
              </>
            )}
          </div>

          {guard.wards.length > 0 && (
            <div className="card mt-2">
              <div className="text-sm font-semibold">
                You watch out for {guard.wards.map((w) => w.name.split(" ")[0]).join(", ")}
              </div>
              {guard.alerts.length === 0 ? (
                <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
                  Nothing unusual so far. You'll see any odd transfer attempt here the moment it happens.
                </p>
              ) : (
                <div className="flex flex-col gap-2 mt-2.5">
                  {guard.alerts.map((a) => {
                    const active = a.status === "held" && (a.holdUntil ?? 0) > Date.now();
                    return (
                      <div key={a.id} className="card-soft">
                        <div className="flex items-center gap-2">
                          <div className="text-[0.8125rem] font-semibold flex-1">
                            {a.wardName.split(" ")[0]} tried to send {naira(a.amount)} to {a.name}
                          </div>
                          <span className={"chip " + (a.risk === "block" ? "chip-danger" : "chip-warn")}>
                            {a.risk === "block" ? "Blocked" : "Flagged"}
                          </span>
                        </div>
                        <div className="text-[0.6875rem] mt-1" style={{ color: "var(--muted)" }}>
                          {timeAgo(a.ts)}
                          {active && ` · on hold until ${clockTime(a.holdUntil!)}`}
                          {a.status === "released" && " · you released it"}
                          {a.status === "cleared" && " · you said it looked fine"}
                        </div>
                        {a.status === "open" && (
                          <div className="flex gap-2 mt-2.5">
                            <button className="btn btn-ghost flex-1" style={{ minHeight: 40, padding: "8px 10px", fontSize: "0.8125rem", color: "var(--warn)" }} disabled={gBusy} onClick={() => actOnAlert("hold", a.id)}>
                              <Icon name="pause" size={14} /> Hold 30 min
                            </button>
                            <button className="btn btn-ghost flex-1" style={{ minHeight: 40, padding: "8px 10px", fontSize: "0.8125rem", color: "var(--ok)" }} disabled={gBusy} onClick={() => actOnAlert("clear", a.id)}>
                              <Icon name="check" size={14} /> Looks fine
                            </button>
                          </div>
                        )}
                        {active && (
                          <button className="btn btn-ghost btn-block mt-2.5" style={{ minHeight: 40, padding: "8px 10px", fontSize: "0.8125rem" }} disabled={gBusy} onClick={() => actOnAlert("release", a.id)}>
                            Release the hold
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* decision log preview → full page */}
        <div className="mt-3">
          <div className="flex items-center justify-between">
            <SectionLabel>Recent decisions</SectionLabel>
            {decisions.length > 0 && (
              <Link href="/log" className="text-[0.75rem] font-semibold" style={{ color: "var(--brand-2)" }}>
                See all
              </Link>
            )}
          </div>
          {decisions.length === 0 ? (
            <div className="card text-center" style={{ padding: "22px 16px" }}>
              <IconTile name="doc" tone="info" size={40} />
              <div className="font-semibold text-sm" style={{ marginTop: 10 }}>Nothing yet</div>
              <div className="text-xs mt-1" style={{ color: "var(--muted)" }}>
                Send money or check a message. Whatever we decide shows up here, spelled out.
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {decisions.slice(0, 3).map((d) => {
                const o = OUTCOME[d.outcome] || OUTCOME.allowed;
                return (
                  <div key={d.id} className="card">
                    <div className="flex items-center gap-2">
                      <div className="font-bold text-sm flex-1">{d.title}</div>
                      <span className={"chip " + o.cls}>{o.label}</span>
                    </div>
                    <div className="text-[0.78125rem] mt-1" style={{ color: "var(--muted)" }}>{d.reason}</div>
                    <div className="text-[0.6875rem] mt-1.5" style={{ color: "var(--muted)" }}>{timeAgo(d.ts)}</div>
                  </div>
                );
              })}
              <Link href="/log" className="btn btn-ghost btn-block" style={{ minHeight: 44 }}>
                <Icon name="doc" size={16} /> Open full log ({decisions.length})
              </Link>
            </div>
          )}
        </div>

        <button className="btn btn-ghost btn-block mt-4" onClick={() => { logout(); router.push("/"); }}>
          <Icon name="logout" size={16} /> Log out
        </button>
        <button className="btn btn-ghost btn-block mt-2" style={{ color: "var(--muted)" }} onClick={resetDemo}>
          <Icon name="refresh" size={16} /> Reset demo
        </button>
      </div>
    </AppShell>
  );
}

function Switch({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      aria-label={`${label} — ${on ? "on" : "off"}`}
      className="shrink-0"
      style={{ padding: 8, margin: -8, border: "none", background: "transparent", cursor: "pointer" }}
    >
      <span
        style={{
          display: "block",
          width: 46,
          height: 27,
          borderRadius: 99,
          background: on ? "var(--ok)" : "#33436b",
          position: "relative",
          transition: "background .18s ease",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 3,
            left: on ? 22 : 3,
            width: 21,
            height: 21,
            borderRadius: 99,
            background: "#fff",
            transition: "left .18s ease",
            boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
          }}
        />
      </span>
    </button>
  );
}
