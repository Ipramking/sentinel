export function naira(n: number): string {
  return "₦" + Math.round(n).toLocaleString("en-NG");
}

export function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function clockTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" });
}

export function maskPhone(phone?: string): string {
  const p = (phone || "").replace(/\D/g, "");
  if (p.length < 7) return phone || "";
  return p.slice(0, 4) + " ••• " + p.slice(-3);
}

export function maskAccount(acct?: string): string {
  if (!acct) return "";
  if (acct.length <= 4) return acct;
  return acct.slice(0, 3) + " ••• " + acct.slice(-3);
}
