import { Suspense, cache } from "react";
import Link from "next/link";
import { Plus, ChevronRight } from "lucide-react";
import { getLocation } from "@/lib/location";
import { getCurrentUser } from "@/lib/auth";
import type { User } from "@/lib/db/schema";
import { getTrainingLoad, getSuggestedRoutine, getRecentWorkouts, type Location } from "@/lib/db/queries";
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
import { localHour, prettyDate, todayISO } from "@/lib/format";

function greeting(): string {
  const h = localHour();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

// Shared by the training card and the recent list, so it runs once per request.
const recentFor = cache((userId: number) => getRecentWorkouts(userId, 5));

function Block({ className }: { className: string }) {
  return <div className={cn("bg-muted animate-pulse rounded-2xl", className)} />;
}

// The header and the controls that need no data paint immediately; every data
// section streams in behind its own placeholder instead of blocking the page.
export default async function TodayPage() {
  const [location, user] = await Promise.all([getLocation(), getCurrentUser()]);

  return (
    <main>
      <PageHeader title={`${greeting()}, ${user.name}`} subtitle={prettyDate(todayISO())} />

      <div className="space-y-5 px-4">
        <Suspense fallback={null}>
          <Training userId={user.id} />
        </Suspense>

        <Suspense fallback={<Block className="h-44" />}>
          <Device userId={user.id} />
        </Suspense>

        <Suspense fallback={<Block className="h-24" />}>
          <Insight userId={user.id} />
        </Suspense>

        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-sm">Working out at</span>
          <LocationToggle value={location} />
        </div>

        <CoachSuggestion location={location} />

        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">Suggested for today</h2>
            <Link href="/routines" className="text-muted-foreground -my-2 flex items-center py-2 text-sm">
              All routines <ChevronRight className="size-4" />
            </Link>
          </div>
          <Suspense fallback={<Block className="h-24" />}>
            <Suggested location={location} user={user} />
          </Suspense>
        </section>

        <Link href="/log" className={cn(buttonVariants({ variant: "outline" }), "h-11 w-full")}>
          <Plus className="size-4" /> Log something else
        </Link>

        <section className="space-y-2 pt-1">
          <h2 className="text-sm font-medium">Recent activity</h2>
          <Suspense fallback={<Block className="h-40" />}>
            <Recent userId={user.id} />
          </Suspense>
        </section>
      </div>
    </main>
  );
}

async function Training({ userId }: { userId: number }) {
  const [recent, training] = await Promise.all([recentFor(userId), getTrainingLoad(userId)]);
  return recent.length > 0 ? <TrainingStatusCard status={training} /> : null;
}

async function Device({ userId }: { userId: number }) {
  const [metrics, steps] = await Promise.all([getLatestMetrics(userId), getMetricSeries(userId, "steps", 7)]);
  return (
    <>
      <DeviceMetrics metrics={metrics} stepsSeries={steps} />
      <LiveGarmin enabled={Object.keys(metrics).length > 0} lastSync={metrics.synced_at ?? null} />
    </>
  );
}

async function Insight({ userId }: { userId: number }) {
  const insight = await getLatestInsight(userId, "weekly");
  return <InsightCard initialText={insight?.text ?? null} />;
}

async function Suggested({ location, user }: { location: Location; user: User }) {
  const suggested = await getSuggestedRoutine(location, user);
  return suggested ? (
    <RoutineCard card={suggested} />
  ) : (
    <p className="text-muted-foreground bg-card rounded-xl border p-4 text-sm">
      No routines available here yet. Add equipment in Settings to unlock more.
    </p>
  );
}

async function Recent({ userId }: { userId: number }) {
  const recent = await recentFor(userId);
  if (recent.length === 0) {
    return <p className="text-muted-foreground text-sm">Nothing logged yet. Start with the suggestion above.</p>;
  }
  return (
    <ul className="divide-y rounded-xl border">
      {recent.map((w) => (
        <li key={w.id}>
          <Link
            href={`/workout/${w.id}`}
            className="active:bg-accent/40 flex min-h-14 items-center justify-between gap-2 px-4 py-3 transition-colors"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{w.routineName ?? w.type ?? "Workout"}</p>
              <p className="text-muted-foreground text-xs">{prettyDate(w.date)}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {w.durationMinutes ? <span className="text-muted-foreground text-sm">{w.durationMinutes} min</span> : null}
              <ChevronRight className="text-muted-foreground size-4" />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
