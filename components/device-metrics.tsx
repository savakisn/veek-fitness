import Link from "next/link";
import { Moon, Heart, Star, BatteryMedium, Scale } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { StepsTrend } from "./steps-trend";

const STEP_GOAL = 8000;

function Ring({ value, goal }: { value: number; goal: number }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, value / goal);
  return (
    <div className="relative size-[76px] shrink-0">
      <svg width="76" height="76" viewBox="0 0 76 76" className="-rotate-90">
        <circle cx="38" cy="38" r={r} fill="none" stroke="var(--muted)" strokeWidth="7" />
        <circle
          cx="38"
          cy="38"
          r={r}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-sm font-semibold tabular-nums leading-none">{(value / 1000).toFixed(1)}k</span>
        <span className="text-muted-foreground text-[10px] leading-tight">steps</span>
      </div>
    </div>
  );
}

function Stat({
  href,
  icon: Icon,
  label,
  value,
  sub,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Link href={href} className="flex items-center gap-2">
      <Icon className="text-primary size-4 shrink-0" />
      <div>
        <p className="text-sm font-medium tabular-nums">
          {value}
          {sub ? <span className="text-muted-foreground ml-1 text-xs font-normal">{sub}</span> : null}
        </p>
        <p className="text-muted-foreground text-xs">{label}</p>
      </div>
    </Link>
  );
}

// The latest numbers synced from Garmin. Renders nothing without data, so users
// with no connected device don't see an empty card.
export function DeviceMetrics({
  metrics,
  stepsSeries,
}: {
  metrics: Record<string, number>;
  stepsSeries: { date: string; value: number }[];
}) {
  const steps = metrics.steps;
  const hasStats =
    metrics.resting_hr || metrics.sleep_hours || metrics.sleep_score || metrics.body_battery || metrics.weight;
  if (steps == null && !hasStats && stepsSeries.length === 0) return null;

  return (
    <div className="bg-card space-y-4 rounded-2xl border p-4">
      <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">From your Garmin</p>

      {steps != null && (
        <Link href="/metric/steps" className="flex items-center gap-4">
          <Ring value={steps} goal={STEP_GOAL} />
          <div className="min-w-0 flex-1">
            <p className="text-muted-foreground text-xs">Steps · last 7 days</p>
            {stepsSeries.length > 1 ? (
              <StepsTrend data={stepsSeries} />
            ) : (
              <p className="text-sm">{Math.round(steps).toLocaleString()} yesterday</p>
            )}
          </div>
        </Link>
      )}

      {hasStats && (
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          {metrics.body_battery ? (
            <Stat
              href="/metric/body_battery"
              icon={BatteryMedium}
              label="Body Battery"
              value={String(Math.round(metrics.body_battery))}
              sub={
                metrics.body_battery_charged || metrics.body_battery_drained
                  ? `+${Math.round(metrics.body_battery_charged ?? 0)} / -${Math.round(metrics.body_battery_drained ?? 0)}`
                  : undefined
              }
            />
          ) : null}
          {metrics.resting_hr ? <Stat href="/metric/resting_hr" icon={Heart} label="Resting HR" value={String(Math.round(metrics.resting_hr))} /> : null}
          {metrics.sleep_hours ? <Stat href="/metric/sleep_hours" icon={Moon} label="Sleep" value={`${metrics.sleep_hours}h`} /> : null}
          {metrics.sleep_score ? <Stat href="/metric/sleep_score" icon={Star} label="Sleep score" value={String(Math.round(metrics.sleep_score))} /> : null}
          {metrics.weight ? <Stat href="/metric/weight" icon={Scale} label="Weight" value={`${metrics.weight} lb`} /> : null}
        </div>
      )}
    </div>
  );
}
