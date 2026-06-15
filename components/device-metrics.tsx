import Link from "next/link";
import { Moon, Heart, Star, BatteryMedium, Scale, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { StepsTrend } from "./steps-trend";
import { SyncButton } from "./sync-button";
import { SyncStatus } from "./sync-status";

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

function Tile({
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
    <Link
      href={href}
      className="bg-background hover:bg-accent/40 flex flex-col gap-1 rounded-xl border p-3 transition-colors active:scale-[0.98]"
    >
      <div className="text-muted-foreground flex items-center gap-1.5">
        <Icon className="text-primary size-3.5 shrink-0" />
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-lg font-semibold tabular-nums leading-none">
        {value}
        {sub ? <span className="text-muted-foreground ml-1 text-xs font-normal">{sub}</span> : null}
      </p>
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
    metrics.resting_hr ||
    metrics.sleep_hours ||
    metrics.sleep_score ||
    metrics.body_battery ||
    metrics.weight ||
    metrics.fitness_age;
  if (steps == null && !hasStats && stepsSeries.length === 0) return null;

  return (
    <div className="bg-card space-y-4 rounded-2xl border p-4">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">From your Garmin</p>
        <div className="flex items-center gap-2">
          <SyncStatus epoch={metrics.synced_at} />
          <SyncButton />
        </div>
      </div>

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
        <div className="grid grid-cols-2 gap-2">
          {metrics.body_battery ? (
            <Tile
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
          {metrics.resting_hr ? <Tile href="/metric/resting_hr" icon={Heart} label="Resting HR" value={String(Math.round(metrics.resting_hr))} sub="bpm" /> : null}
          {metrics.sleep_hours ? <Tile href="/metric/sleep_hours" icon={Moon} label="Sleep" value={`${metrics.sleep_hours}h`} /> : null}
          {metrics.sleep_score ? <Tile href="/metric/sleep_score" icon={Star} label="Sleep score" value={String(Math.round(metrics.sleep_score))} /> : null}
          {metrics.weight ? <Tile href="/metric/weight" icon={Scale} label="Weight" value={`${metrics.weight}`} sub="lb" /> : null}
          {metrics.fitness_age ? <Tile href="/metric/fitness_age" icon={Sparkles} label="Fitness age" value={`${Math.round(metrics.fitness_age)}`} sub="yrs" /> : null}
        </div>
      )}
    </div>
  );
}
