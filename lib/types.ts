export type Txn = {
  id: string;
  dir: "in" | "out";
  name: string;
  account?: string;
  amount: number;
  ts: number;
  note?: string;
  reported?: boolean; // user flagged this past transfer as a scam
  ref?: string; // receipt reference — decoy refs never verify as genuine
};

export type Baseline = {
  typicalMax: number; // typical largest transfer they make
  usualHours: [number, number]; // [startHour, endHourExclusive], 24h
  knownPayees: string[]; // account numbers they've safely paid before
};

export type User = {
  id: string;
  name: string;
  initials: string;
  phone: string; // full digits; masked for display
  accountNumber: string;
  balance: number;
  decoyBalance: number; // shown in duress "safe mode"; regenerated (₦0–500) on each duress unlock
  decoyTxns: Txn[]; // consistent fake history while in safe mode
  pin: string;
  duressPin: string;
  trustedContact: string;
  safeMode: boolean;
  duressView?: "decoy" | "network"; // how safe mode is disguised this session
  transactions: Txn[];
  baseline: Baseline;
};

/** One report protects everyone: accounts land here once and block network-wide. */
export type ThreatEntry = {
  account: string;
  name?: string;
  reason: string;
  reportedBy: string;
  ts: number;
};

export type Decision = {
  id: string;
  userId: string;
  kind: "transfer" | "scam" | "unlock" | "report";
  title: string;
  outcome: "allowed" | "review" | "blocked" | "override" | "safe" | "alert";
  reason: string;
  dataUsed: string[];
  ts: number;
};

export type Alert = {
  id: string;
  userId: string;
  kind: "duress" | "fraud-report";
  message: string;
  ts: number;
};

export type DataToggles = {
  spendingHistory: boolean; // amount + known payee checks
  deviceSignals: boolean; // time / device checks
  networkFeed: boolean; // herd-immunity threat ledger
};

export type AiEngine = "auto" | "gemini" | "core";

/** Sentinel Core — our own naive-Bayes scam classifier, trained on community reports. */
export type CoreModel = {
  tokens: Record<string, { s: number; h: number }>; // per-token scam/ham doc counts
  docs: { s: number; h: number };
  examples: number; // total messages learned from
  communityReports: number; // herd reports that taught the model
  updatedAt: number;
};

export type DB = {
  users: Record<string, User>;
  ledger: ThreatEntry[];
  decisions: Decision[];
  alerts: Alert[];
  toggles: Record<string, DataToggles>;
  model: CoreModel;
  aiPrefs: Record<string, AiEngine>;
};
