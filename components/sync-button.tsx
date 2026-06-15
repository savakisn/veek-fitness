"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Manual full Garmin sync (weight, sleep, activity samples) — the live route on
// app-open only refreshes today's body battery, so this fills in the rest.
export function SyncButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function sync() {
    if (busy) return;
    setBusy(true);
    try {
      const r = await fetch("/api/garmin/sync", { method: "POST" });
      const d = await r.json();
      if (d?.ok) {
        toast.success(`Synced ${d.activities} activities, ${d.metrics} readings.`);
        router.refresh();
      } else {
        toast.error(d?.error ?? "Sync failed.");
      }
    } catch {
      toast.error("Sync failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={sync}
      disabled={busy}
      aria-label="Sync Garmin now"
      className="text-muted-foreground hover:text-foreground -m-1 p-1 transition-colors"
    >
      <RefreshCw className={cn("size-4", busy && "animate-spin")} />
    </button>
  );
}
