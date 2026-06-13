import Link from "next/link";
import { Flame, Plus, ChevronRight } from "lucide-react";
import { getLocation } from "@/lib/location";
import { getStreak, getSuggestedRoutine, getRecentWorkouts } from "@/lib/db/queries";
import { PageHeader } from "@/components/page-header";
import { LocationToggle } from "@/components/location-toggle";
import { RoutineCard } from "@/components/routine-card";
import { Progress } from "@/components/ui/progress";
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
  const location = await getLocation();
  const [streak, suggested, recent] = await Promise.all([
    getStreak(),
    getSuggestedRoutine(location),
    getRecentWorkouts(5),
  ]);

  const pct = Math.min(100, Math.round((streak.thisWeekCount / streak.weeklyGoal) * 100));

  return (
    <main>
      <PageHeader title={greeting()} subtitle={prettyDate(todayISO())} />

      <div className="space-y-5 px-4">
        <div className="bg-card rounded-2xl border p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className={streak.streakWeeks > 0 ? "size-5 text-orange-500" : "text-muted-foreground size-5"} />
              <span className="text-2xl font-semibold">{streak.streakWeeks}</span>
              <span className="text-muted-foreground text-sm">week{streak.streakWeeks === 1 ? "" : "s"} streak</span>
            </div>
            <span className="text-muted-foreground text-sm">
              {streak.thisWeekCount}/{streak.weeklyGoal} this week
            </span>
          </div>
          <Progress value={pct} className="mt-4" />
          <p className="text-muted-foreground mt-2 text-xs">
            {streak.goalMetThisWeek
              ? "Goal hit for the week. Anything more is a bonus."
              : `${Math.max(0, streak.weeklyGoal - streak.thisWeekCount)} more to hit this week's goal.`}
          </p>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-sm">Working out at</span>
          <LocationToggle value={location} />
        </div>

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
                <li key={w.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{w.routineName ?? w.type ?? "Workout"}</p>
                    <p className="text-muted-foreground text-xs">{prettyDate(w.date)}</p>
                  </div>
                  {w.durationMinutes ? (
                    <span className="text-muted-foreground text-sm">{w.durationMinutes} min</span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
