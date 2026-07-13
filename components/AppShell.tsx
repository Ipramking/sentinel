"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isUnlocked } from "@/lib/client";
import { Icon } from "./icons";
import { PageSkeleton } from "./ui";

const NAV = [
  { href: "/dashboard", label: "Home", icon: "home" },
  { href: "/transfer", label: "Send", icon: "send" },
];

export function AppShell({
  children,
  active,
}: {
  children: React.ReactNode;
  active: string;
}) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isUnlocked()) {
      router.replace("/");
      return;
    }
    setReady(true);
  }, [router]);

  return (
    <div className="shell">
      {ready ? (
        <div className="scroll">{children}</div>
      ) : (
        <div className="scroll">
          <PageSkeleton />
        </div>
      )}
      <nav className="tabbar" aria-label="Main" style={{ gridTemplateColumns: `repeat(${NAV.length}, 1fr)` }}>
        {NAV.map((n) => {
          const on = n.href === active;
          return (
            <Link key={n.href} href={n.href} className={"tab" + (on ? " on" : "")} aria-current={on ? "page" : undefined}>
              <Icon name={n.icon} size={22} strokeWidth={on ? 2.2 : 1.8} />
              <span>{n.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
