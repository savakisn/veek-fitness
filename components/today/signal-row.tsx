import Link from "next/link";
import { cn } from "@/lib/utils";
import { METRIC } from "@/lib/metric-keys";
import type { Signal, SignalKey } from "@/lib/readiness/types";

// Where a tap on each signal goes: the metric's own history page.
const METRIC_OF: Partial<Record<SignalKey, string>> = {
  hrv: METRIC.hrvOvernight,
  sleep: METRIC.sleepHours,
  resting_hr: METRIC.restingHr,
  body_battery: METRIC.bodyBattery,
  load: METRIC.acuteLoad,
};

const SHORT: Partial<Record<SignalKey, string>> = {
  resting_hr: "RHR",
  body_battery: "Battery",
};

const ORDER: SignalKey[] = ["hrv", "sleep", "resting_hr", "body_battery", "load"];

function fmt(n: number, key: SignalKey): string {
  return key === "sleep" ? n.toFixed(1) : String(Math.round(n));
}

function delta(s: Signal): string | null {
  if (s.value == null || s.baseline == null) return null;
  const d = s.value - s.baseline;
  const r = s.key === "sleep" ? Math.round(d * 10) / 10 : Math.round(d);
  if (r === 0) return "at norm";
  // A real minus sign, so +3 and −3 line up in tabular figures.
  return `${r > 0 ? "+" : "−"}${s.key === "sleep" ? Math.abs(r).toFixed(1) : Math.abs(r)}`;
}

const TONE: Record<Signal["effect"], string> = {
  good: "text-good",
  bad: "text-warn",
  neutral: "text-muted-foreground",
  missing: "text-muted-foreground/60",
};

// Five readings, each against your own 28-day norm. The norm, not the raw number,
// is the point: 52 bpm means nothing until you know you usually sit at 49.
export function SignalRow({ signals }: { signals: Signal[] }) {
  const byKey = new Map(signals.map((s) => [s.key, s]));
  // Five empty tiles read as broken; with nothing to show, say so once.
  if (ORDER.every((k) => byKey.get(k)?.value == null)) {
    return (
      <p className="text-muted-foreground text-sm">
        No watch readings yet. HRV, sleep, resting HR, Body Battery and load show up here after the next Garmin sync.
      </p>
    );
  }
  return (
    <ul className="grid grid-cols-5 gap-1.5">
      {ORDER.map((key) => {
        const s = byKey.get(key);
        const label = SHORT[key] ?? s?.label ?? key;
        const missing = !s || s.value == null;
        const d = s ? delta(s) : null;
        const sr = missing
          ? `${label}: no reading yet`
          : `${s.label} ${fmt(s.value!, key)} ${s.unit}${d ? `, ${d === "at norm" ? "at your norm" : `${d} vs your norm`}` : ", no norm yet"}`;
        return (
          <li key={key}>
            <Link
              href={`/metric/${METRIC_OF[key]}`}
              aria-label={sr}
              className="bg-card active:bg-muted flex h-[4.75rem] flex-col justify-between rounded-2xl px-2 py-2.5 transition-colors"
            >
              <span className="text-muted-foreground truncate text-xs">{label}</span>
              {missing ? (
                <span className="text-muted-foreground/60 text-lg leading-6 font-bold">&ndash;</span>
              ) : (
                <span className="flex h-6 items-baseline text-lg leading-6 font-black tabular-nums">
                  {fmt(s.value!, key)}
                  {s.unit && s.unit !== "bpm" ? (
                    <span className="text-muted-foreground ml-px text-[11px] font-bold">{s.unit}</span>
                  ) : null}
                </span>
              )}
              <span className={cn("truncate text-xs font-bold tabular-nums", TONE[s?.effect ?? "missing"])}>
                {missing ? "no data" : (d ?? "no norm")}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
