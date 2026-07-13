export type Txn = {
  id: string;
  dir: "in" | "out";
  name: string;
  account?: string;
  amount: number;
  ts: number;
  note?: string;
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
  pin: string;
  transactions: Txn[];
  baseline: Baseline;
};

export type Decision = {
  id: string;
  userId: string;
  kind: "transfer" | "unlock";
  title: string;
  outcome: "allowed" | "review" | "blocked" | "override";
  reason: string;
  dataUsed: string[];
  ts: number;
};

export type DataToggles = {
  spendingHistory: boolean; // amount + known payee checks
  deviceSignals: boolean; // time / device checks
};

export type DB = {
  users: Record<string, User>;
  decisions: Decision[];
  toggles: Record<string, DataToggles>;
};
