"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { flushQueue } from "@/lib/offline-queue";

const STALE_MS = 60 * 1000;
const CLOCK_SLACK_MS = 3000;

// Registers the service worker and keeps what it serves honest. The worker shows
// the last copy of a page instantly, so if this document was rendered before the
// visit began (it came from cache), refresh to pull fresh data. Also refresh when
// the app returns from a minute or more in the background.
// Also flushes workouts logged offline, on load and when the connection returns.
export function Pwa({ renderedAt }: { renderedAt: number }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    // A few seconds of slack for clock skew between the server and the phone.
    // Offline there's nothing fresher to get; static pages (/log) also land here.
    if (navigator.onLine && renderedAt < performance.timeOrigin - CLOCK_SLACK_MS) router.refresh();

    let hiddenAt = 0;
    const onVisibility = () => {
      if (document.visibilityState === "hidden") hiddenAt = Date.now();
      else if (navigator.onLine && hiddenAt && Date.now() - hiddenAt > STALE_MS) router.refresh();
    };
    const sync = async () => {
      const n = await flushQueue();
      if (n > 0) {
        toast.success(`Synced ${n} offline ${n === 1 ? "entry" : "entries"}.`);
        router.refresh();
      }
    };
    sync();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", sync);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", sync);
    };
    // renderedAt is only meaningful for the first document load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  // Signed-out: drop cached signed-in pages.
  useEffect(() => {
    if (pathname === "/login") navigator.serviceWorker?.controller?.postMessage("clear-pages");
  }, [pathname]);

  return null;
}
