"use client";

import { useEffect, useState } from "react";
import { BodyBatteryChart } from "./body-battery-chart";

// Loads today's intraday curve after the page is already on screen, so opening
// the body battery deep-dive is instant.
export function BodyBatteryToday() {
  const [samples, setSamples] = useState<{ ts: number; level: number }[] | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/garmin/body-battery", { method: "GET" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => alive && setSamples(d?.samples ?? []))
      .catch(() => alive && setSamples([]));
    return () => {
      alive = false;
    };
  }, []);

  if (samples === null) {
    return <div className="bg-muted h-56 w-full animate-pulse rounded-2xl" />;
  }
  if (samples.length < 2) return null;
  return <BodyBatteryChart samples={samples} />;
}
