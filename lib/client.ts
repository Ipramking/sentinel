"use client";

// Which demo profile this browser/device is acting as.
const USER_KEY = "sentinel.userId";
const UNLOCK_KEY = "sentinel.unlocked";

export function getUserId(): string {
  if (typeof window === "undefined") return "ada";
  return localStorage.getItem(USER_KEY) || "ada";
}

export function setUserId(id: string) {
  localStorage.setItem(USER_KEY, id);
}

export function setUnlocked(v: boolean) {
  if (v) sessionStorage.setItem(UNLOCK_KEY, "1");
  else sessionStorage.removeItem(UNLOCK_KEY);
}

export function isUnlocked(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(UNLOCK_KEY) === "1";
}

async function req(path: string, body?: unknown) {
  const res = await fetch(path, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  if (res.status === 404) {
    // The demo store is in-memory; on serverless hosting an instance recycle wipes
    // signed-up accounts. Treat "unknown user" as an expired demo session, not a crash.
    if (typeof window !== "undefined" && path !== "/api/signup") {
      setUnlocked(false);
      localStorage.setItem(USER_KEY, "ada");
      window.location.href = "/?expired=1";
    }
    throw new Error("session-expired");
  }
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  return res.json();
}

export function logout() {
  setUnlocked(false);
}

export const api = {
  state: (userId: string) => req(`/api/state?userId=${userId}`),
  unlock: (userId: string, pin: string) => req("/api/unlock", { userId, pin }),
  unlockByPhone: (phone: string, pin: string) => req("/api/unlock", { phone, pin }),
  signup: (payload: { name: string; phone: string; pin: string; duressPin: string }) =>
    req("/api/signup", payload),
  topup: (userId: string) => req("/api/topup", { userId }),
  transfer: (userId: string, account: string, name: string, amount: number, hour?: number) =>
    req("/api/transfer", { userId, account, name, amount, hour }),
  confirmTransfer: (userId: string, account: string, name: string, amount: number) =>
    req("/api/transfer", { userId, account, name, amount, confirm: true }),
  overrideTransfer: (userId: string, account: string, name: string, amount: number) =>
    req("/api/transfer", { userId, account, name, amount, override: true }),
  scamCheck: (payload: { userId: string; text?: string; imageBase64?: string; mimeType?: string }) =>
    req("/api/scam-check", payload),
  engine: (userId: string) => req(`/api/engine?userId=${userId}`),
  setAiEngine: (userId: string, aiEngine: string) => req("/api/engine", { userId, aiEngine }),
  report: (userId: string, account: string, name: string, txnId?: string, message?: string) =>
    req("/api/report", { userId, account, name, txnId, message }),
  ledger: () => req("/api/ledger"),
  reset: () => req("/api/reset", {}),
};
