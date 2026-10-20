import { Suspense, cache } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getLocation } from "@/lib/location";
import { getCurrentUser } from "@/lib/auth";
import type { User } from "@/lib/db/schema";
import { getRecentWorkouts, getRoutineCards, getStreak, type Location, type RoutineCard } from "@/lib/db/queries";
import { getTodaysCall } from "@/lib/db/day-calls";
import { getLatestInsight, getLatestMetrics } from "@/lib/db/insights";
import { getReadiness } from "@/lib/db/readiness";
import { explainReadinessSafe } from "@/lib/ai/readiness";
import { getBackStatus } from "@/lib/db/back-status";
import { getCurrentMealPlan } from "@/lib/db/kitchen";
import type { Readiness } from "@/lib/readiness/types";
import { LiveGarmin } from "@/components/live-garmin";
import { SyncStatus } from "@/components/sync-status";
import { LocationToggle } from "@/components/location-toggle";
import { InsightCard } from "@/components/insight-card";
import { VerdictHero } from "@/components/today/verdict-hero";
import { BackCheck } from "@/components/today/back-check";
import { SignalRow } from "@/components/today/signal-row";
import { WeekStrip } from "@/components/today/week-strip";
import { DinnerLine } from "@/components/today/dinner-line";
import { HeroSkeleton, Block } from "@/components/today/skeletons";
import { prettyDate, todayISO } from "@/lib/format";

// Per-request dedupe: the hero and the signals both read readiness; the week strip
// and the recent list both read workouts.
const readinessFor = cache((userId: number) => getReadiness(userId));
const recentFor = cache((userId: number) => getRecentWorkouts(userId, 20));

const longDate = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });

// Gentle goal tags, the ones that still fit a rest or low-intensity day.
const GENTLE = new Set(["recovery", "mobility", "yoga"]);

// getTodaysCall picks inside the readiness limits, but the call stays fixed for the
// day, so a back check-in after the pick can tighten the limits under it. If the
// call now breaks them, show the first available routine that doesn't, and say so.
function fitToLimits(call: RoutineCard | null, cards: RoutineCard[], limits: Readiness["limits"]) {
  const breaks = (c: RoutineCard) =>
    limits.avoidCategories.includes(c.goalTag) ||
    ((limits.maxIntensity === "none" || limits.maxIntensity === "low") && !GENTLE.has(c.goalTag));
  if (!call || !breaks(call)) return { routine: call, swappedFrom: null };
  const alt = cards.find((c) => c.available && !breaks(c));
  return alt ? { routine: alt, swappedFrom: call.name } : { routine: call, swappedFrom: null };
}

// Order of the page is the order of the questions: what kind of day, what to do,
// how's the back, why (signals), where the week stands, what's for dinner.
// Everything that needs data streams in behind a placeholder of the same shape.
export default async function TodayPage() {
  const [location, user] = await Promise.all([getLocation(), getCurrentUser()]);
  const today = todayISO();

  return (
    <main className="px-4">
      <header className="flex items-center justify-between gap-3 pt-[max(1.25rem,env(safe-area-inset-top))] pb-3">
        <p className="text-eyebrow">
          <time dateTime={today}>{longDate.format(new Date(today + "T00:00:00Z"))}</time>
        </p>
        <LocationToggle value={location} />
      </header>

      <Suspense fallback={<HeroSkeleton />}>
        <Hero user={user} location={location} />
      </Suspense>

      <div className="mt-4">
        <Suspense fallback={<Block className="h-11" />}>
          <Back userId={user.id} />
        </Suspense>
      </div>

      <div className="mt-7">
        <Suspense fallback={<Block className="h-[6.5rem]" />}>
          <Signals userId={user.id} />
        </Suspense>
      </div>

      <div className="mt-5">
        <Suspense fallback={<Block className="h-16" />}>
          <Dinner today={today} />
        </Suspense>
      </div>

      <div className="mt-7">
        <Suspense fallback={<Block className="h-[5.25rem]" />}>
          <Week user={user} today={today} />
        </Suspense>
      </div>

      <div className="mt-12 space-y-8 pb-4">
        <section aria-labelledby="recent-title">
          <div className="flex items-center justify-between">
            <h2 id="recent-title" className="text-eyebrow">
              Recent
            </h2>
            <Link href="/history" className="text-muted-foreground -mr-1 flex min-h-11 items-center text-sm">
              History <ChevronRight className="size-4" aria-hidden />
            </Link>
          </div>
          <Suspense fallback={<Block className="h-40" />}>
            <Recent userId={user.id} />
          </Suspense>
        </section>

        <Suspense fallback={<Block className="h-24" />}>
          <Insight userId={user.id} />
        </Suspense>
      </div>
    </main>
  );
}

async function Hero({ user, location }: { user: User; location: Location }) {
  const [readiness, call, cards] = await Promise.all([
    readinessFor(user.id),
    getTodaysCall(location, user),
    getRoutineCards(location, user),
  ]);
  const { routine, swappedFrom } = fitToLimits(call, cards, readiness.limits);
  // The model rewrites the reason from the computed signals; any failure keeps the engine's headline.
  const headline = await explainReadinessSafe(readiness);
  // Only what the sheet renders crosses to the client.
  const options = cards
    .filter((c) => c.available && c.id !== routine?.id)
    .map((c) => ({ slug: c.slug, name: c.name, estMinutes: c.estMinutes, goalTag: c.goalTag }));
  return (
    <VerdictHero
      readiness={{ ...readiness, headline }}
      routine={routine}
      swappedFrom={swappedFrom}
      options={options}
      location={location}
    />
  );
}

async function Back({ userId }: { userId: number }) {
  return <BackCheck current={await getBackStatus(userId)} />;
}

async function Signals({ userId }: { userId: number }) {
  const [readiness, metrics] = await Promise.all([readinessFor(userId), getLatestMetrics(userId)]);
  const hasGarmin = Object.keys(metrics).length > 0;
  return (
    <section aria-labelledby="signals-title">
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <h2 id="signals-title" className="text-eyebrow">
          {readiness.score != null ? (
            <>
              Readiness <span className="text-foreground font-black tabular-nums">{readiness.score}</span>
              <span className="font-normal"> vs your norm</span>
            </>
          ) : (
            "Signals vs your norm"
          )}
        </h2>
        <SyncStatus epoch={metrics.synced_at} />
      </div>
      <SignalRow signals={readiness.signals} />
      <LiveGarmin enabled={hasGarmin} lastSync={metrics.synced_at ?? null} />
    </section>
  );
}

async function Week({ user, today }: { user: User; today: string }) {
  const [recent, streak] = await Promise.all([recentFor(user.id), getStreak(user)]);
  return (
    <WeekStrip
      today={today}
      doneDates={recent.map((w) => w.date)}
      goal={user.weeklyGoalSessions}
      streakWeeks={streak.streakWeeks}
    />
  );
}

async function Dinner({ today }: { today: string }) {
  return <DinnerLine plan={await getCurrentMealPlan()} today={today} />;
}

async function Insight({ userId }: { userId: number }) {
  const insight = await getLatestInsight(userId, "weekly");
  return <InsightCard initialText={insight?.text ?? null} />;
}

async function Recent({ userId }: { userId: number }) {
  const recent = (await recentFor(userId)).slice(0, 5);
  if (recent.length === 0) {
    return <p className="text-muted-foreground py-2 text-sm">Nothing logged yet. Today&apos;s routine is a good first one.</p>;
  }
  return (
    <ul className="divide-border divide-y">
      {recent.map((w) => (
        <li key={w.id}>
          <Link
            href={`/workout/${w.id}`}
            className="active:bg-card -mx-2 flex min-h-14 items-center justify-between gap-3 rounded-xl px-2 py-2.5 transition-colors"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{w.routineName ?? w.type ?? "Workout"}</p>
              <p className="text-muted-foreground text-xs">{prettyDate(w.date)}</p>
            </div>
            {w.durationMinutes ? (
              <span className="text-muted-foreground shrink-0 text-sm tabular-nums">{w.durationMinutes} min</span>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}
