"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Icon } from "@/components/icons";
import { Tilt } from "@/components/Tilt";
import { IconTile, PageSkeleton, SectionLabel, Sheet } from "@/components/ui";
import { api, getUserId, logout } from "@/lib/client";
import { maskAccount, naira, timeAgo } from "@/lib/format";

type Txn = { id: string; dir: "in" | "out"; name: string; account?: string; amount: number; ts: number; note?: string };

type State = {
  user: { name: string; initials: string; phone: string; accountNumber: string };
  balance: number;
  transactions: Txn[];
};

const ACTIONS = [
  { icon: "send", label: "Send", href: "/transfer" },
  { icon: "phone", label: "Airtime" },
  { icon: "wifi", label: "Data" },
  { icon: "receipt", label: "Bills" },
];

export default function Dashboard() {
  const router = useRouter();
  const uid = typeof window !== "undefined" ? getUserId() : "ada";
  const [s, setS] = useState<State | null>(null);
  const [hide, setHide] = useState(false);
  const [toast, setToast] = useState("");
  const [sheet, setSheet] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => api.state(uid).then(setS).catch(() => {}), [uid]);
  useEffect(() => { load(); }, [load]);

  function say(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
  }

  function copyAccount() {
    if (!s) return;
    navigator.clipboard?.writeText(s.user.accountNumber).catch(() => {});
    say("Account number copied");
  }

  async function addMoney() {
    if (!s || busy) return;
    setBusy(true);
    try {
      const r = await api.topup(uid);
      if (r.ok) {
        say(`Added ${naira(r.amount)} to your balance`);
        load();
      } else {
        say("Can't top up right now. Try again in a bit.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell active="/dashboard">
      {!s ? (
        <PageSkeleton />
      ) : (
        <div className="fade-in">
          {/* hero */}
          <div className="hero" style={{ padding: "18px 20px 24px", borderBottomLeftRadius: 26, borderBottomRightRadius: 26 }}>
            <div className="flex items-center justify-between">
              <button className="flex items-center gap-2.5 text-left" style={{ background: "transparent", border: "none", cursor: "pointer", color: "#fff", padding: 0, minHeight: 44 }} onClick={() => setSheet(true)}>
                <div className="display flex items-center justify-center font-bold" style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(255,255,255,0.18)" }}>
                  {s.user.initials}
                </div>
                <div>
                  <div className="text-xs" style={{ opacity: 0.75 }}>Welcome back</div>
                  <div className="font-bold text-sm">{s.user.name}</div>
                </div>
              </button>
              <span className="chip" style={{ background: "rgba(56,198,238,0.14)", color: "var(--accent-soft)", border: "1px solid rgba(56,198,238,0.32)" }}>
                <span className="pulse-dot" /> Protected
              </span>
            </div>

            {/* account card — a physical object: tilts with your finger */}
            <Tilt className="mt-4" style={{ background: "linear-gradient(150deg, rgba(255,255,255,0.09), rgba(255,255,255,0.045))", border: "1px solid rgba(255,255,255,0.16)", borderRadius: 18, padding: "14px 16px" }}>
              <div className="flex items-center justify-between">
                <span className="text-[0.71875rem]" style={{ opacity: 0.75 }}>Savings · {maskAccount(s.user.accountNumber)}</span>
                <button className="chip" style={{ background: "rgba(255,255,255,0.14)", color: "#fff", border: "none", cursor: "pointer" }} onClick={copyAccount}>
                  <Icon name="copy" size={12} /> Copy
                </button>
              </div>
              <div className="flex items-center gap-1 mt-1.5">
                <div className="amount font-bold" style={{ fontSize: "2rem" }}>
                  {hide ? "₦ ••••••" : naira(s.balance)}
                </div>
                <button className="icon-btn" style={{ color: "#fff", opacity: 0.85 }} onClick={() => setHide((h) => !h)} aria-label={hide ? "Show balance" : "Hide balance"}>
                  <Icon name="eye" size={19} />
                </button>
              </div>
              <div className="flex gap-2 mt-3">
                <Link href="/transfer" className="btn flex-1" style={{ background: "#fff", color: "var(--brand)", minHeight: 42, padding: "10px 14px" }}>
                  <Icon name="send" size={16} /> Send
                </Link>
                <button className="btn flex-1" style={{ background: "rgba(255,255,255,0.14)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)", minHeight: 42, padding: "10px 14px" }} disabled={busy} onClick={addMoney}>
                  <Icon name="plus" size={16} /> Add money
                </button>
              </div>
            </Tilt>
          </div>

          {/* quick actions */}
          <div className="grid grid-cols-4 gap-2 px-4 pt-4">
            {ACTIONS.map((a) =>
              a.href ? (
                <Link key={a.label} href={a.href} className="card flex flex-col items-center gap-1.5" style={{ padding: "12px 4px" }}>
                  <IconTile name={a.icon} tone="info" size={36} />
                  <div className="text-[0.6875rem] font-semibold">{a.label}</div>
                </Link>
              ) : (
                <button
                  key={a.label}
                  className="card flex flex-col items-center gap-1.5"
                  style={{ padding: "12px 4px", cursor: "pointer" }}
                  onClick={() => say("Not part of the demo. We kept the focus on the security bits.")}
                >
                  <IconTile name={a.icon} tone="info" size={36} />
                  <div className="text-[0.6875rem] font-semibold">{a.label}</div>
                </button>
              ),
            )}
          </div>

          {/* activity */}
          <div className="px-4 pt-3 pb-5">
            <SectionLabel>Recent activity</SectionLabel>
            <div className="card" style={{ padding: 6 }}>
              {s.transactions.map((t, i) => (
                <div key={t.id}>
                  <div className="w-full flex items-center gap-3 text-left" style={{ padding: "11px 10px" }}>
                    <IconTile name={t.dir === "in" ? "in" : "out"} tone={t.dir === "in" ? "ok" : "info"} size={38} />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate">{t.name}</div>
                      <div className="text-xs" style={{ color: "var(--muted)" }}>
                        {t.note ? t.note + " · " : ""}
                        {timeAgo(t.ts)}
                      </div>
                    </div>
                    <div className="amount font-bold text-sm" style={{ color: t.dir === "in" ? "var(--ok)" : "var(--ink)" }}>
                      {t.dir === "in" ? "+" : "−"}
                      {naira(t.amount)}
                    </div>
                  </div>
                  {i < s.transactions.length - 1 && <div className="divider" style={{ margin: "0 10px" }} />}
                </div>
              ))}
            </div>
          </div>

          {/* profile sheet */}
          <Sheet open={sheet} onClose={() => setSheet(false)}>
            <div className="flex items-center gap-3">
              <div className="display flex items-center justify-center font-bold" style={{ width: 48, height: 48, borderRadius: 14, background: "var(--info-bg)", color: "var(--brand-2)" }}>
                {s.user.initials}
              </div>
              <div>
                <div className="font-bold">{s.user.name}</div>
                <div className="text-xs" style={{ color: "var(--muted)" }}>{s.user.phone}</div>
              </div>
            </div>
            <div className="card-soft mt-4">
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <div className="text-[0.6875rem]" style={{ color: "var(--muted)" }}>Account number</div>
                  <div className="text-sm font-semibold mono">{s.user.accountNumber}</div>
                </div>
                <button className="chip chip-brand" style={{ border: "none", cursor: "pointer" }} onClick={copyAccount}>
                  <Icon name="copy" size={12} /> Copy
                </button>
              </div>
            </div>
            <button className="btn btn-ghost btn-block mt-4" style={{ color: "var(--danger)" }} onClick={() => { logout(); router.push("/"); }}>
              <Icon name="logout" size={17} /> Log out
            </button>
          </Sheet>

          {/* toast */}
          {toast && (
            <div
              className="fade-in text-[0.8125rem] font-semibold"
              style={{ position: "absolute", left: 20, right: 20, bottom: 78, zIndex: 50, background: "var(--elev)", border: "1px solid var(--line)", color: "#fff", borderRadius: 14, padding: "12px 16px", textAlign: "center", boxShadow: "0 10px 30px rgba(0,4,14,0.5)" }}
              role="status"
            >
              {toast}
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}
