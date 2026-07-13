"use client";

import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/ui";
import { ScamChecker } from "@/components/ScamChecker";

export default function ScamGuard() {
  return (
    <AppShell active="/scamguard">
      <PageHeader
        icon="shield-check"
        title="ScamGuard"
        subtitle="Got a message you're not sure about? Paste it or drop a screenshot. Our AI reads it and tells you if it's a scam before you lose a naira."
      />
      <div className="p-4 fade-in">
        <ScamChecker />
      </div>
    </AppShell>
  );
}
