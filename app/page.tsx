import Link from "next/link";
import { Plus, ChevronRight } from "lucide-react";
import { getLocation } from "@/lib/location";
import { getCurrentUser } from "@/lib/auth";
import { getTrainingLoad, getSuggestedRoutine, getRecentWorkouts } from "@/lib/db/queries";
import { getLatestInsight, getLatestMetrics, getMetricSeries } from "@/lib/db/insights";
import { PageHeader } from "@/components/page-header";
import { DeviceMetrics } from "@/components/device-metrics";
import { LiveGarmin } from "@/components/live-garmin";
import { TrainingStatusCard } from "@/components/training-status-card";
import { LocationToggle } from "@/components/location-toggle";
import { RoutineCard } from "@/components/routine-card";
import { InsightCard } from "@/components/insight-card";
import { CoachSuggestion } from "@/components/coach-suggestion";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { prettyDate, todayISO } from "@/lib/format";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default async function TodayPage() {
  const [location, user] = await Promise.all([getLocation(), getCurrentUser()]);
  const [training, suggested, recent, insight, deviceMetrics, stepsSeries] = await Promise.all([
    getTrainingLoad(user.id),
    getSuggestedRoutine(location, user),
    getRecentWorkouts(user.id, 5),
    getLatestInsight(user.id, "weekly"),
    getLatestMetrics(user.id),
    getMetricSeries(user.id, "steps", 7),
  ]);

  return (
    <main>
      <PageHeader title={`${greeting()}, ${user.name}`} subtitle={prettyDate(todayISO())} />

      <div className="space-y-5 px-4">
        <TrainingStatusCard status={training} />

        <DeviceMetrics metrics={deviceMetrics} stepsSeries={stepsSeries} />
        <LiveGarmin enabled={Object.keys(deviceMetrics).length > 0} />

        <InsightCard initialText={insight?.text ?? null} />

        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-sm">Working out at</span>
          <LocationToggle value={location} />
        </div>

        <CoachSuggestion location={location} />

        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">Suggested for today</h2>
            <Link href="/routines" className="text-muted-foreground flex items-center text-sm">
              All routines <ChevronRight className="size-4" />
            </Link>
          </div>
          {suggested ? (
            <RoutineCard card={suggested} />
          ) : (
            <p className="text-muted-foreground bg-card rounded-xl border p-4 text-sm">
              No routines available here yet. Add equipment in Settings to unlock more.
            </p>
          )}
        </section>

        <Link href="/log" className={cn(buttonVariants({ variant: "outline" }), "h-11 w-full")}>
          <Plus className="size-4" /> Log something else
        </Link>

        <section className="space-y-2 pt-1">
          <h2 className="text-sm font-medium">Recent activity</h2>
          {recent.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nothing logged yet. Start with the suggestion above.</p>
          ) : (
            <ul className="divide-y rounded-xl border">
              {recent.map((w) => (
                <li key={w.id}>
                  <Link
                    href={`/workout/${w.id}`}
                    className="hover:bg-accent/40 flex items-center justify-between gap-2 px-4 py-3 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{w.routineName ?? w.type ?? "Workout"}</p>
                      <p className="text-muted-foreground text-xs">{prettyDate(w.date)}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {w.durationMinutes ? (
                        <span className="text-muted-foreground text-sm">{w.durationMinutes} min</span>
                      ) : null}
                      <ChevronRight className="text-muted-foreground size-4" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
