import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getMetricSeries } from "@/lib/db/insights";
import { fitnessAgeBreakdown } from "@/lib/fitness-age";
import { MetricChart } from "@/components/metric-chart";
import { FitnessAgeBreakdownCard } from "@/components/fitness-age-breakdown";
import { LogWeight } from "@/components/log-weight";

export const dynamic = "force-dynamic";

const META: Record<string, { label: string; unit: string; variant: "bar" | "line"; decimals: number }> = {
  steps: { label: "Steps", unit: "", variant: "bar", decimals: 0 },
  resting_hr: { label: "Resting heart rate", unit: " bpm", variant: "line", decimals: 0 },
  weight: { label: "Weight", unit: " lb", variant: "line", decimals: 1 },
  body_battery: { label: "Body Battery", unit: "", variant: "line", decimals: 0 },
  sleep_hours: { label: "Sleep", unit: "h", variant: "line", decimals: 1 },
  sleep_score: { label: "Sleep score", unit: "", variant: "line", decimals: 0 },
  fitness_age: { label: "Fitness age", unit: " yrs", variant: "line", decimals: 0 },
};

function prettyDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export default async function MetricPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const meta = META[id];
  if (!meta) notFound();

  const user = await getCurrentUser();
  const series = await getMetricSeries(user.id, id, 30);
  const breakdown = id === "fitness_age" ? await fitnessAgeBreakdown(await getDb(), user.id) : null;
  const fmt = (v: number) => `${v.toFixed(meta.decimals)}${meta.unit}`;
  const latest = series.length ? series[series.length - 1] : null;

  return (
    <main className="px-4">
      <div className="pt-6">
        <Link href="/" className="text-muted-foreground inline-flex items-center text-sm">
          <ArrowLeft className="mr-1 size-4" /> Today
        </Link>
      </div>
      <div className="pt-4">
        <h1 className="text-2xl font-semibold tracking-tight">{meta.label}</h1>
        {latest && (
          <p className="text-muted-foreground mt-1 text-sm">
            Latest {fmt(latest.value)} · {prettyDate(latest.date)}
          </p>
        )}
      </div>

      {id === "weight" && (
        <div className="mt-5">
          <LogWeight />
        </div>
      )}

      {breakdown && (
        <div className="mt-5">
          <FitnessAgeBreakdownCard b={breakdown} />
        </div>
      )}

      {series.length === 0 ? (
        <p className="text-muted-foreground mt-6 text-sm">No data yet. It fills in as your device syncs.</p>
      ) : (
        <>
          <div className="mt-5">
            <MetricChart data={series} variant={meta.variant} />
          </div>
          <ul className="mt-5 divide-y rounded-xl border">
            {[...series].reverse().map((r) => (
              <li key={r.date} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-muted-foreground text-sm">{prettyDate(r.date)}</span>
                <span className="text-sm font-medium tabular-nums">{fmt(r.value)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
