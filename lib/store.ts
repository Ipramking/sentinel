import type { DB, DataToggles, Txn, User } from "./types";

const HOUR = 3600_000;
const DAY = 24 * HOUR;

function ada(): User {
  const now = Date.now();
  return {
    id: "ada",
    name: "Ada Okoro",
    initials: "AO",
    phone: "08031112214",
    accountNumber: "0011223344",
    balance: 486350,
    pin: "1234",
    baseline: {
      typicalMax: 60000,
      usualHours: [6, 23],
      knownPayees: ["0221145678", "1029384756", "5544332211"],
    },
    transactions: [
      { id: "t1", dir: "in", name: "Salary — Kola & Co", amount: 420000, ts: now - 2 * DAY, note: "March salary" },
      { id: "t2", dir: "out", name: "Mummy", account: "0221145678", amount: 25000, ts: now - 1.6 * DAY, note: "Upkeep" },
      { id: "t3", dir: "out", name: "MTN Airtime", amount: 2000, ts: now - 1.2 * DAY },
      { id: "t4", dir: "out", name: "Shoprite Lekki", amount: 18450, ts: now - 20 * HOUR, note: "Groceries" },
      { id: "t5", dir: "out", name: "Landlord — Rent pool", account: "1029384756", amount: 50000, ts: now - 8 * HOUR },
      { id: "t6", dir: "in", name: "Gbenga", account: "5544332211", amount: 15000, ts: now - 5 * HOUR, note: "Refund" },
    ],
  };
}

function bola(): User {
  const now = Date.now();
  return {
    id: "bola",
    name: "Bola Adeyemi",
    initials: "BA",
    phone: "08104550077",
    accountNumber: "0099887766",
    balance: 132900,
    pin: "4321",
    baseline: {
      typicalMax: 40000,
      usualHours: [6, 23],
      knownPayees: ["7788990011", "1234509876"],
    },
    transactions: [
      { id: "b1", dir: "in", name: "Ada Okoro", account: "0011223344", amount: 12000, ts: now - 1.1 * DAY, note: "Contribution" },
      { id: "b2", dir: "out", name: "DSTV", amount: 9500, ts: now - 22 * HOUR, note: "Subscription" },
      { id: "b3", dir: "out", name: "Market — Mile 12", amount: 15600, ts: now - 6 * HOUR },
    ],
  };
}

function defaultToggles(): DataToggles {
  return { spendingHistory: true, deviceSignals: true };
}

function seed(): DB {
  return {
    users: { ada: ada(), bola: bola() },
    decisions: [],
    toggles: { ada: defaultToggles(), bola: defaultToggles() },
  };
}

// Persist across Next dev hot-reloads via globalThis.
declare global {
  // eslint-disable-next-line no-var
  var __sentinelDB: DB | undefined;
}

export const db: DB = globalThis.__sentinelDB ?? (globalThis.__sentinelDB = seed());

/** Replace the DB contents in place so every module's `db` reference stays valid. */
function adopt(data: DB) {
  db.users = data.users;
  db.decisions = data.decisions;
  db.toggles = data.toggles;
}

export function resetDB() {
  adopt(seed());
  return db;
}

/* ---- persistence seam ----
   Every route reads through hydrate() and writes through persist(). With a
   MONGODB_URI set, the demo DB lives in MongoDB Atlas as one snapshot document:
   each request re-reads it, each mutation writes it back, and a version stamp
   keeps a lambda from regressing below its own last write. Without a URI both
   calls are no-ops and the store is purely in-memory — which is exactly what
   makes the two-device demo work on one laptop. */

let localVersion = 0; // newest snapshot version this instance has seen or written

type Snapshot = { _id: string; v: number; data: DB };

declare global {
  // eslint-disable-next-line no-var
  var __sentinelMongo: Promise<import("mongodb").MongoClient> | undefined;
}

async function snapshots() {
  const uri = process.env.MONGODB_URI;
  if (!uri) return null;
  const { MongoClient } = await import("mongodb");
  // one shared connection per runtime, reused across hot lambda invocations
  globalThis.__sentinelMongo ??= MongoClient.connect(uri);
  const client = await globalThis.__sentinelMongo;
  return client.db("sentinel").collection<Snapshot>("state");
}

export async function hydrate() {
  try {
    const col = await snapshots();
    if (!col) return;
    const doc = await col.findOne({ _id: "db" });
    if (!doc || doc.v <= localVersion) return;
    adopt(doc.data);
    localVersion = doc.v;
  } catch {
    // fall back to whatever this instance has in memory
  }
}

export async function persist() {
  try {
    const col = await snapshots();
    if (!col) return;
    const v = Math.max(Date.now(), localVersion + 1);
    await col.replaceOne({ _id: "db" }, { v, data: db }, { upsert: true });
    localVersion = v;
  } catch {
    // a lost write only costs demo state, never a failed response
  }
}

export function getUser(id: string): User | undefined {
  return db.users[id];
}

export function findUserByPhone(phone: string): User | undefined {
  const p = String(phone || "").replace(/\D/g, "");
  return Object.values(db.users).find((u) => u.phone.replace(/\D/g, "") === p);
}

export function getToggles(id: string): DataToggles {
  return db.toggles[id] ?? defaultToggles();
}

export function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function randomAccountNumber(): string {
  let acct = "";
  do {
    acct = "02" + String(Math.floor(Math.random() * 1e8)).padStart(8, "0");
  } while (Object.values(db.users).some((u) => u.accountNumber === acct));
  return acct;
}

export function createUser(input: { name: string; phone: string; pin: string }): User {
  const now = Date.now();
  const name = input.name.trim();
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const user: User = {
    id: uid("u"),
    name,
    initials: initials || "SN",
    phone: input.phone.replace(/\D/g, ""),
    accountNumber: randomAccountNumber(),
    balance: 150000, // demo starting balance so judges can play immediately
    pin: input.pin,
    baseline: { typicalMax: 40000, usualHours: [6, 23], knownPayees: [] },
    transactions: [
      { id: uid("t"), dir: "in", name: "Welcome to Sentinel", amount: 150000, ts: now, note: "Demo starting balance" },
    ],
  };
  db.users[user.id] = user;
  db.toggles[user.id] = defaultToggles();
  return user;
}

export function recordTxn(user: User, txn: Txn) {
  if (txn.dir === "out") user.balance -= txn.amount;
  else user.balance += txn.amount;
  user.transactions.unshift(txn);
}
