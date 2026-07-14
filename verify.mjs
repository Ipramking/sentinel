const B = "http://localhost:3220";
let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => {
  if (cond) { pass++; console.log(`PASS ${name}`); }
  else { fail++; console.log(`FAIL ${name} ${extra}`); }
};
const post = (p, body) => fetch(B + p, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json());
const get = (p) => fetch(B + p).then(r => r.json());

await post("/api/reset", {});

// 1. signup + phone sign-in
const su = await post("/api/signup", { name: "Judge Test", phone: "08011122233", pin: "5555", duressPin: "9555" });
ok("signup", su.ok && su.userId && /^\d{10}$/.test(su.accountNumber), JSON.stringify(su));
const dupe = await post("/api/signup", { name: "Judge Test", phone: "08011122233", pin: "5555", duressPin: "9555" });
ok("signup duplicate rejected", dupe.ok === false);
const badPin = await post("/api/signup", { name: "X Y", phone: "08099999999", pin: "12", duressPin: "9555" });
ok("signup bad pin rejected", badPin.ok === false);
const pinClash = await post("/api/signup", { name: "Pin Clash", phone: "08077700011", pin: "1111", duressPin: "1111" });
ok("signup rejects duress == normal pin", pinClash.ok === false);
const si = await post("/api/unlock", { phone: "08011122233", pin: "5555" });
ok("phone sign-in", si.ok && si.mode === "normal" && si.userId === su.userId);
const wrong = await post("/api/unlock", { phone: "08011122233", pin: "0000" });
ok("wrong pin rejected", wrong.ok === false);
const judge = su.userId;

// 2. new user state
let st = await get(`/api/state?userId=${judge}`);
ok("new user balance 150k", st.balance === 150000);
ok("state has account + transactions", !!st.user.accountNumber && Array.isArray(st.transactions));

// 3. step-up then payee learning
const t1 = await post("/api/transfer", { userId: judge, account: "0455667788", name: "Chidera", amount: 45000, hour: 14 });
ok("new payee 45k -> review", t1.status === "review", t1.status);
const t1c = await post("/api/transfer", { userId: judge, account: "0455667788", name: "Chidera", amount: 45000, hour: 14, confirm: true });
ok("step-up confirm completes", t1c.status === "completed");
const t2 = await post("/api/transfer", { userId: judge, account: "0455667788", name: "Chidera", amount: 45000, hour: 14 });
ok("same payee again -> frictionless (learned)", t2.status === "completed" && t2.frictionless === true, JSON.stringify(t2.risk?.reasons));

// 4. insufficient funds
const t3 = await post("/api/transfer", { userId: judge, account: "0455667788", name: "Chidera", amount: 999999, hour: 14 });
ok("insufficient funds", t3.status === "failed" && t3.error === "insufficient");

// 5. topup
const tu = await post("/api/topup", { userId: judge });
ok("topup +20k", tu.ok && tu.amount === 20000);

// 6. known payee sails through, odd hour gets noticed
const m1 = await post("/api/transfer", { userId: "ada", account: "0221145678", name: "Mummy", amount: 15000, hour: 14 });
ok("known payee frictionless", m1.status === "completed" && m1.frictionless === true, JSON.stringify(m1));
const late = await post("/api/transfer", { userId: judge, account: "0888777666", name: "Night Stranger", amount: 5000, hour: 2 });
ok("odd hour + new payee -> review", late.status === "review" && JSON.stringify(late.risk.reasons).includes("outside the hours"), JSON.stringify(late.risk));

// 7. blocked -> override (ada)
const b1 = await post("/api/transfer", { userId: "ada", account: "3388776655", name: "Acct Verification Team", amount: 180000, hour: 14 });
ok("scam-pattern transfer blocked", b1.status === "blocked" && b1.risk.score >= 70, JSON.stringify(b1));
const o1 = await post("/api/transfer", { userId: "ada", account: "3388776655", name: "Acct Verification Team", amount: 180000, hour: 14, override: true });
ok("override completes", o1.status === "completed" && o1.overridden === true);
st = await get("/api/state?userId=ada");
ok("balance reflects the sends", st.balance === 486350 - 15000 - 180000, `bal=${st.balance}`);

// 8. report the past transaction -> herd immunity
const past = st.transactions.find(t => t.account === "3388776655");
ok("override txn in history", !!past);
const rep = await post("/api/report", { userId: "ada", account: "3388776655", name: "Acct Verification Team", txnId: past.id });
ok("report past txn", rep.ok && rep.ledgerCount === 1);
st = await get("/api/state?userId=ada");
ok("txn flagged reported", st.transactions.find(t => t.id === past.id)?.reported === true);
ok("reportedAccounts includes scam acct", st.reportedAccounts.includes("3388776655"));
const b2 = await post("/api/transfer", { userId: "bola", account: "3388776655", name: "Whoever", amount: 5000, hour: 14 });
ok("herd immunity blocks bola", b2.status === "blocked" && b2.risk.score === 100 && !!b2.risk.ledgerHit, JSON.stringify(b2.risk));
const led = await get("/api/ledger");
ok("ledger endpoint lists the report", led.ledger.length === 1 && led.ledger[0].account === "3388776655" && led.protectedUsers >= 3);
const repDupe = await post("/api/report", { userId: "bola", account: "3388776655", name: "Same account" });
ok("duplicate report doesn't double-list", repDupe.ok && repDupe.ledgerCount === 1);

// 9. ScamGuard reads a message
const sc = await post("/api/scam-check", {
  userId: "ada",
  text: "Dear customer your account has been BLOCKED due to failed BVN verification. Transfer the reactivation fee immediately and reply with your OTP to confirm.",
});
ok("scamguard flags an obvious scam", ["scam", "suspicious"].includes(sc.verdict?.verdict) && sc.verdict.redFlags.length > 0, JSON.stringify(sc.verdict));

// 10. Sentinel Core + engine switcher
const eng0 = await get("/api/engine?userId=ada");
ok("engine defaults to auto with a pre-trained core", eng0.aiEngine === "auto" && eng0.core.examples >= 28, JSON.stringify(eng0));
const engSet = await post("/api/engine", { userId: "ada", aiEngine: "core" });
ok("switch to Sentinel Core", engSet.aiEngine === "core");
const scCore = await post("/api/scam-check", {
  userId: "ada",
  text: "Dear customer your account has been BLOCKED due to failed BVN verification. Transfer the reactivation fee immediately and reply with your OTP to confirm.",
});
ok("core engine classifies the scam itself", scCore.engine === "core" && scCore.verdict.source === "core" && scCore.verdict.verdict === "scam", JSON.stringify(scCore));
const repTeach = await post("/api/report", {
  userId: "ada",
  account: "0909090909",
  name: "Reported scam account",
  message: "You have won a federal grant of 750,000 pay the clearance token now with your BVN to claim it",
});
ok("report accepted", repTeach.ok === true);
const eng1 = await get("/api/engine?userId=ada");
ok("herd report taught the model", eng1.core.communityReports >= 1 && eng1.core.examples > eng0.core.examples, JSON.stringify(eng1.core));
const engBack = await post("/api/engine", { userId: "ada", aiEngine: "auto" });
ok("switch back to auto", engBack.aiEngine === "auto");

// 11. duress: decoy account engine
const du = await post("/api/unlock", { userId: "bola", pin: "9222" });
ok("duress PIN unlocks in duress mode", du.ok && du.mode === "duress" && du.userId === "bola");
let bst = await get("/api/state?userId=bola");
ok("decoy balance shows (0-500)", bst.safeMode === true && bst.balance <= 500);
ok("duress session picked a disguise", ["decoy", "network"].includes(bst.duressView), bst.duressView);
ok("decoy history replaces the real one", bst.transactions.length === 5 && bst.transactions.some((t) => t.name === "Salary"), JSON.stringify(bst.transactions?.map((t) => t.name)));
const cs = await post("/api/transfer", { userId: "bola", account: "0777666555", name: "Coerced Send", amount: 100, hour: 14, confirm: true });
ok("coerced send completes against the decoy", cs.status === "completed");
bst = await get("/api/state?userId=bola");
ok("coerced send landed in decoy history only", bst.transactions.length === 6);
const tu2 = await post("/api/topup", { userId: "bola" });
ok("top-up refused while coerced", tu2.ok === false);
const back = await post("/api/unlock", { userId: "bola", pin: "4321" });
ok("normal PIN restores the real account", back.ok && back.mode === "normal");
bst = await get("/api/state?userId=bola");
ok("real balance untouched by the coerced session", bst.safeMode === false && bst.balance === 132900, `bal=${bst.balance}`);
ok("coerced txns absent from real history", !bst.transactions.some((t) => t.name === "Coerced Send"));
const relearn = await post("/api/transfer", { userId: "bola", account: "0777666555", name: "Coerced Send", amount: 100, hour: 14 });
ok("coerced payee was never learned", relearn.status === "review");

// 12. receipts + public verify
ok("completed transfer carries a receipt ref", /^SNT-/.test(t1c.ref || ""), t1c.ref);
const v1 = await post("/api/verify", { ref: t1c.ref });
ok("genuine ref verifies with real details", v1.ok && v1.found === true && v1.receipt.amount === 45000, JSON.stringify(v1));
const v2 = await post("/api/verify", { ref: "SNT-FAKE-0000" });
ok("made-up ref returns no record", v2.ok && v2.found === false);
await post("/api/unlock", { userId: "bola", pin: "9222" });
const dst = await get("/api/state?userId=bola");
const decoyRef = dst.transactions.find((t) => t.ref)?.ref;
const v3 = await post("/api/verify", { ref: decoyRef });
ok("decoy ref plays dumb (same no-record answer)", v3.ok && v3.found === false, decoyRef);
const led2 = await get("/api/ledger");
ok("checking a decoy ref trips a silent duress alert", led2.alerts.some((a) => a.kind === "duress"));
await post("/api/unlock", { userId: "bola", pin: "4321" });

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
