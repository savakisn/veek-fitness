import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, Heart, Flame, Route, Mountain, Gauge } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getWorkoutById } from "@/lib/db/queries";
import { prettyDate } from "@/lib/format";
import { WorkoutTypeEditor } from "@/components/workout-type-editor";
import { HrChart } from "@/components/hr-chart";

export const dynamic = "force-dynamic";
const EFFORT = ["", "Easy", "Light", "Moderate", "Hard", "All out"];

export default async function WorkoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const w = await getWorkoutById(Number(id), user.id);
  if (!w) notFound();

  const d = w.detail ?? {};
  const stats: { label: string; value: string; icon: LucideIcon }[] = [];
  if (w.durationMinutes) stats.push({ label: "Duration", value: `${w.durationMinutes} min`, icon: Clock });
  if (d.distanceKm) stats.push({ label: "Distance", value: `${d.distanceKm} km`, icon: Route });
  if (d.avgHr) stats.push({ label: "Avg HR", value: `${d.avgHr} bpm`, icon: Heart });
  if (d.maxHr) stats.push({ label: "Max HR", value: `${d.maxHr} bpm`, icon: Heart });
  if (d.calories) stats.push({ label: "Calories", value: String(d.calories), icon: Flame });
  if (d.elevationM) stats.push({ label: "Elevation", value: `${d.elevationM} m`, icon: Mountain });
  if (w.perceivedEffort) stats.push({ label: "Effort", value: EFFORT[w.perceivedEffort], icon: Gauge });

  return (
    <main className="px-4">
      <div className="pt-6">
        <Link href="/history" className="text-muted-foreground inline-flex items-center text-sm">
          <ArrowLeft className="mr-1 size-4" /> History
        </Link>
      </div>
      <div className="pt-4">
        <p className="text-muted-foreground text-sm">
          {prettyDate(w.date)}
          {w.location ? ` · ${w.location}` : ""}
          {w.source === "garmin" ? " · Garmin" : ""}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{w.routineName ?? w.type ?? "Workout"}</h1>
      </div>

      {stats.length > 0 && (
        <div className="mt-5 grid grid-cols-2 gap-3">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="bg-card flex items-center gap-2 rounded-xl border p-3">
                <Icon className="text-primary size-4 shrink-0" />
                <div>
                  <p className="text-sm font-medium tabular-nums">{s.value}</p>
                  <p className="text-muted-foreground text-xs">{s.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {d.hrSamples && d.hrSamples.length > 1 && (
        <div className="mt-4">
          <HrChart samples={d.hrSamples} />
        </div>
      )}

      {w.notes && <p className="text-muted-foreground mt-4 text-sm">{w.notes}</p>}

      <div className="mt-8">
        <WorkoutTypeEditor id={w.id} type={w.type ?? ""} />
      </div>
    </main>
  );
}
