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
  const json = await res.json();
  // Broadcast safe-mode so shell-level guards (screenshot deterrent) can react
  // without every page threading state down.
  if (typeof window !== "undefined" && path.startsWith("/api/state") && typeof json.safeMode === "boolean") {
    sessionStorage.setItem(SAFE_KEY, json.safeMode ? "1" : "");
    window.dispatchEvent(new CustomEvent("sentinel-mode", { detail: json.safeMode }));
  }
  return json;
}

const SAFE_KEY = "sentinel.safeMode";

export function getSafeMode(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(SAFE_KEY) === "1";
}

export function logout() {
  setUnlocked(false);
}

export const api = {
  state: (userId: string) => req(`/api/state?userId=${userId}`),
  unlock: (userId: string, pin: string, cadence?: number) => req("/api/unlock", { userId, pin, cadence }),
  unlockByPhone: (phone: string, pin: string, cadence?: number) => req("/api/unlock", { phone, pin, cadence }),
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
  guardian: (userId: string) => req(`/api/guardian?userId=${userId}`),
  guardianSet: (userId: string, phone: string) => req("/api/guardian", { userId, action: "set", phone }),
  guardianRemove: (userId: string) => req("/api/guardian", { userId, action: "remove" }),
  guardianAct: (userId: string, action: "hold" | "release" | "clear", alertId: string) =>
    req("/api/guardian", { userId, action, alertId }),
  setAiEngine: (userId: string, aiEngine: string) => req("/api/engine", { userId, aiEngine }),
  report: (userId: string, account: string, name: string, txnId?: string, message?: string) =>
    req("/api/report", { userId, account, name, txnId, message }),
  verifyRef: (ref: string) => req("/api/verify", { ref }),
  ledger: () => req("/api/ledger"),
  reset: () => req("/api/reset", {}),
};
