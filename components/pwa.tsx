"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { flushQueue } from "@/lib/offline-queue";

// Registers the service worker (offline app shell) and flushes any workouts that
// were logged offline, on load and whenever the connection returns.
export function Pwa() {
  const router = useRouter();
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    const sync = async () => {
      const n = await flushQueue();
      if (n > 0) {
        toast.success(`Synced ${n} offline ${n === 1 ? "entry" : "entries"}.`);
        router.refresh();
      }
    };
    sync();
    window.addEventListener("online", sync);
    return () => window.removeEventListener("online", sync);
  }, [router]);
  return null;
}
