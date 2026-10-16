import Link from "next/link";
import { getRecentWorkouts, getStreak } from "@/lib/db/queries";
import { getCurrentUser } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { DeletableWorkoutRow } from "@/components/deletable-workout-row";
import { prettyDate } from "@/lib/format";

export const dynamic = "force-dynamic";

const EFFORT = ["", "Easy", "Light", "Moderate", "Hard", "All out"];

export default async function HistoryPage() {
  const user = await getCurrentUser();
  const [workouts, streak] = await Promise.all([getRecentWorkouts(user.id, 100), getStreak(user)]);

  return (
    <main>
      <PageHeader title="History" subtitle={`${streak.totalSessions} sessions logged`} />

      <div className="px-4">
        {workouts.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nothing here yet.</p>
        ) : (
          <ul className="divide-y rounded-xl border">
            {workouts.map((w) => (
              <DeletableWorkoutRow key={w.id} id={w.id}>
                <Link href={`/workout/${w.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{w.routineName ?? w.type ?? "Workout"}</p>
                    <p className="text-muted-foreground text-xs">
                      {prettyDate(w.date)}
                      {w.location ? ` · ${w.location}` : ""}
                      {w.perceivedEffort ? ` · ${EFFORT[w.perceivedEffort]}` : ""}
                    </p>
                  </div>
                  {w.durationMinutes ? (
                    <span className="text-muted-foreground text-sm tabular-nums">{w.durationMinutes}m</span>
                  ) : null}
                </Link>
              </DeletableWorkoutRow>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
