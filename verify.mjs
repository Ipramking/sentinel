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
const su = await post("/api/signup", { name: "Judge Test", phone: "08011122233", pin: "5555" });
ok("signup", su.ok && su.userId && /^\d{10}$/.test(su.accountNumber), JSON.stringify(su));
const dupe = await post("/api/signup", { name: "Judge Test", phone: "08011122233", pin: "5555" });
ok("signup duplicate rejected", dupe.ok === false);
const badPin = await post("/api/signup", { name: "X Y", phone: "08099999999", pin: "12" });
ok("signup bad pin rejected", badPin.ok === false);
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

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
