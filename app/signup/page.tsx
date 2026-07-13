"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { api, setUnlocked, setUserId } from "@/lib/client";

export default function SignUp() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const ready = name.trim().length >= 2 && phone.length === 11 && pin.length === 4;

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const r = await api.signup({ name, phone, pin });
      if (!r.ok) {
        setError(r.error || "Could not open the account. Check your details.");
        return;
      }
      const u = await api.unlockByPhone(phone, pin);
      if (u.ok) {
        setUserId(u.userId);
        setUnlocked(true);
        router.push("/dashboard");
        return;
      }
      router.push("/");
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="shell hero">
      <div className="scroll flex flex-col text-white px-5 pt-6 pb-7">
        <div className="flex items-center gap-3">
          <Link href="/" className="icon-btn" style={{ color: "#fff", background: "rgba(255,255,255,0.1)" }} aria-label="Back to sign in">
            <Icon name="chevron" size={18} style={{ transform: "rotate(180deg)" }} />
          </Link>
          <div>
            <h1 className="display font-bold text-xl">Open an account</h1>
            <p className="text-[0.78125rem]" style={{ color: "rgba(255,255,255,0.65)" }}>
              Under a minute, and you start with ₦150,000 to play with.
            </p>
          </div>
        </div>

        <div className="card mt-5" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.16)" }}>
          <label className="label" style={{ color: "rgba(255,255,255,0.75)" }}>Full name</label>
          <input
            className="input"
            style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.25)", color: "#fff" }}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Ngozi Bello"
            autoComplete="name"
          />

          <label className="label mt-3" style={{ color: "rgba(255,255,255,0.75)" }}>Phone number</label>
          <input
            className="input mono"
            style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.25)", color: "#fff" }}
            inputMode="numeric"
            maxLength={11}
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
            placeholder="080X XXX XXXX (11 digits)"
          />

          <label className="label mt-3" style={{ color: "rgba(255,255,255,0.75)" }}>4-digit PIN</label>
          <input
            className="input mono text-center"
            style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.25)", color: "#fff" }}
            inputMode="numeric"
            maxLength={4}
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            placeholder="••••"
          />
        </div>

        <div className="text-center text-[0.8125rem] font-semibold mt-3" style={{ minHeight: 20, color: "#ffb4c4" }} role="alert">
          {error}
        </div>

        <button
          className="btn btn-block mt-1"
          style={{ background: "#fff", color: "var(--brand)" }}
          disabled={!ready || busy}
          onClick={submit}
        >
          {busy ? "Opening your account…" : "Open my account"}
        </button>

        <p className="text-center text-xs mt-4" style={{ color: "rgba(255,255,255,0.5)" }}>
          This is a demo, so accounts here are just for trying things out.
        </p>
      </div>
    </div>
  );
}
