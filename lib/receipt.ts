"use client";

import { naira } from "./format";

export type ReceiptData = {
  ref: string;
  amount: number;
  dir: "in" | "out";
  counterparty: string;
  account?: string;
  note?: string;
  ts: number;
  userName: string;
  userAccount: string;
};

/* Renders a bank-style PNG receipt on a canvas and downloads it.
   On screen a safe-mode receipt looks completely real (that's the decoy),
   but the moment it leaves the phone as a file it is plastered with FAKE —
   so a duress receipt can never be used as proof of payment to defraud someone. */
export function downloadReceipt(r: ReceiptData, fake: boolean) {
  const W = 680;
  const H = 980;
  const canvas = document.createElement("canvas");
  const scale = 2;
  canvas.width = W * scale;
  canvas.height = H * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(scale, scale);

  // paper
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  // navy header
  const grad = ctx.createLinearGradient(0, 0, W, 190);
  grad.addColorStop(0, "#1b3c74");
  grad.addColorStop(1, "#081733");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, 190);

  ctx.fillStyle = "#a5e7ff";
  ctx.font = "700 30px Arial";
  ctx.fillText("SENTINEL", 40, 62);
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font = "400 17px Arial";
  ctx.fillText("Transaction receipt", 40, 92);

  ctx.fillStyle = "#ffffff";
  ctx.font = "800 44px Arial";
  ctx.fillText(`${r.dir === "out" ? "−" : "+"}${naira(r.amount)}`, 40, 156);

  // status
  ctx.fillStyle = fake ? "#d92d3f" : "#0d9a63";
  ctx.font = "700 19px Arial";
  ctx.fillText(fake ? "✗ FAKE — NOT A REAL TRANSACTION" : "✓ Completed", 40, 236);

  // detail rows
  const rows: [string, string][] = [
    [r.dir === "out" ? "To" : "From", r.counterparty],
    ...(r.account ? ([["Account", r.account]] as [string, string][]) : []),
    ["Sender", `${r.userName} · ${r.userAccount}`],
    ["Reference", r.ref],
    ["Date", new Date(r.ts).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })],
    ...(r.note ? ([["Note", r.note]] as [string, string][]) : []),
    ["Channel", "Sentinel instant transfer"],
  ];
  let y = 300;
  for (const [label, value] of rows) {
    ctx.fillStyle = "#58657b";
    ctx.font = "400 16px Arial";
    ctx.fillText(label, 40, y);
    ctx.fillStyle = "#0f1a2e";
    ctx.font = "600 19px Arial";
    ctx.fillText(String(value).slice(0, 44), 40, y + 28);
    ctx.strokeStyle = "#e3e7ef";
    ctx.beginPath();
    ctx.moveTo(40, y + 48);
    ctx.lineTo(W - 40, y + 48);
    ctx.stroke();
    y += 82;
  }

  // footer
  ctx.fillStyle = "#58657b";
  ctx.font = "400 14px Arial";
  ctx.fillText("Check this reference on Sentinel before you hand over anything.", 40, H - 96);
  ctx.fillText("If it doesn't check out, the money never moved.", 40, H - 76);
  ctx.fillStyle = "#2456e0";
  ctx.font = "600 14px Arial";
  ctx.fillText(`${location.origin}/verify`, 40, H - 48);

  if (fake) {
    // tiled diagonal FAKE watermark — impossible to crop out
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.rotate(-Math.PI / 6);
    ctx.fillStyle = "rgba(217, 45, 63, 0.16)";
    ctx.font = "800 110px Arial";
    for (let ty = -H; ty < H; ty += 170) {
      for (let tx = -W - 200; tx < W + 200; tx += 420) {
        ctx.fillText("FAKE", tx + (ty % 340 === 0 ? 0 : 210), ty);
      }
    }
    ctx.restore();

    // explicit red banner
    ctx.fillStyle = "#d92d3f";
    ctx.fillRect(0, H - 200, W, 62);
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 20px Arial";
    ctx.fillText("DURESS RECEIPT — GENERATED IN SAFE MODE", 40, H - 170);
    ctx.font = "600 15px Arial";
    ctx.fillText("No money left this account. Reference will not verify.", 40, H - 148);
  }

  const a = document.createElement("a");
  a.href = canvas.toDataURL("image/png");
  a.download = `sentinel-receipt-${r.ref}.png`;
  a.click();
}
