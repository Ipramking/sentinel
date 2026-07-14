import { db, getToggles } from "./store";
import type { User } from "./types";

export type RiskReason = { text: string; data: string };

export type RiskResult = {
  score: number; // 0..100
  level: "allow" | "review" | "block";
  reasons: RiskReason[];
  ledgerHit?: { name?: string; reason: string; reportedBy: string };
  headline: string;
};

function naira(n: number) {
  return "₦" + n.toLocaleString("en-NG");
}

/** Money that left this account in the last 7 days. */
export function weeklyOut(user: User): number {
  const cutoff = Date.now() - 7 * 24 * 3600_000;
  return user.transactions.filter((t) => t.dir === "out" && t.ts >= cutoff).reduce((s, t) => s + t.amount, 0);
}

export function assessTransfer(user: User, amount: number, account: string, atHour: number): RiskResult {
  const t = getToggles(user.id);
  const reasons: RiskReason[] = [];
  let score = 0;

  // Network threat feed (herd immunity) — highest priority.
  if (t.networkFeed) {
    const hit = db.ledger.find((e) => e.account === account);
    if (hit) {
      reasons.push({
        text: `Someone else already reported this account for a scam. That's why we stopped it before you got burned.`,
        data: "Sentinel network threat feed",
      });
      return {
        score: 100,
        level: "block",
        reasons,
        ledgerHit: { name: hit.name, reason: hit.reason, reportedBy: hit.reportedBy },
        headline: "The network already flagged this one",
      };
    }
  }

  // Spending-history signals.
  const isKnown = user.baseline.knownPayees.includes(account);
  if (t.spendingHistory) {
    if (account && !isKnown) {
      score += 35;
      reasons.push({
        text: "You've never sent money to this account before.",
        data: "Your payment history",
      });
    }
    const ratio = amount / user.baseline.typicalMax;
    if (amount > user.baseline.typicalMax) {
      score += 30;
      reasons.push({
        text: `That's about ${ratio.toFixed(1)} times your usual top amount of ${naira(user.baseline.typicalMax)}.`,
        data: "Your spending pattern",
      });
      if (ratio >= 3) {
        score += 20;
        reasons.push({
          text: "It's way more than you'd normally move in one go.",
          data: "Your spending pattern",
        });
      }
    }

    // Weekly pace: a week that's already way past normal is how drain-the-account
    // scams look. A small nudge, never a block on its own.
    const pace = weeklyOut(user) / Math.max(1, user.baseline.typicalWeekOut);
    if (pace > 2) {
      score += 10;
      reasons.push({
        text: `You've already sent about ${pace.toFixed(1)} times your usual weekly amount this week.`,
        data: "Your spending pattern",
      });
    }
  }

  // Device / context signals.
  if (t.deviceSignals) {
    const [start, end] = user.baseline.usualHours;
    const odd = atHour < start || atHour >= end;
    if (odd) {
      score += 25;
      const label = atHour === 0 ? "12am" : atHour < 12 ? `${atHour}am` : atHour === 12 ? "12pm" : `${atHour - 12}pm`;
      reasons.push({
        text: `It's ${label}, well outside the hours you usually bank.`,
        data: "Device time & activity pattern",
      });
    }
  }

  score = Math.min(100, score);
  const level = score >= 70 ? "block" : score >= 35 ? "review" : "allow";

  const headline =
    level === "allow"
      ? "Looks like you. Sending it through"
      : level === "review"
        ? "One quick check before this goes out"
        : "Something's off here, so we paused it";

  if (level === "allow" && reasons.length === 0) {
    reasons.push({
      text: "This lines up with how you normally bank: someone you've paid, an ordinary amount, at a normal time.",
      data: "Your behavioural profile",
    });
  }

  return { score, level, reasons, headline };
}
