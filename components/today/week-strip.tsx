import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { addDaysISO, weekStartISO } from "@/lib/format";

const LETTERS = ["M", "T", "W", "T", "F", "S", "S"];
const NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// Monday to Sunday with the days you trained filled in, and the weekly goal beside it.
export function WeekStrip({
  today,
  doneDates,
  goal,
  streakWeeks,
}: {
  today: string;
  doneDates: string[];
  goal: number;
  streakWeeks: number;
}) {
  const start = weekStartISO(today);
  const done = new Set(doneDates);
  const days = LETTERS.map((_, i) => addDaysISO(start, i));
  const count = days.filter((d) => done.has(d)).length;
  const met = count >= goal;

  return (
    <section aria-label="This week">
      <div className="flex items-baseline justify-between">
        <h2 className="text-eyebrow">This week</h2>
        <p className="text-sm">
          <span className={cn("font-black tabular-nums", met && "text-primary")}>
            {count} of {goal}
          </span>
          <span className="text-muted-foreground"> sessions</span>
          {streakWeeks > 1 ? <span className="text-muted-foreground">, {streakWeeks}-week streak</span> : null}
        </p>
      </div>
      <ol className="mt-2.5 grid grid-cols-7 gap-1.5">
        {days.map((d, i) => {
          const isDone = done.has(d);
          const isToday = d === today;
          const future = d > today;
          return (
            <li
              key={d}
              aria-label={`${NAMES[i]}${isToday ? ", today" : ""}: ${isDone ? "trained" : future ? "to come" : "no session"}`}
              className="flex flex-col items-center gap-1.5"
            >
              <span
                className={cn(
                  "flex size-10 items-center justify-center rounded-full text-xs font-bold",
                  isDone ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground",
                  future && !isDone && "bg-transparent ring-1 ring-border ring-inset",
                  isToday && "ring-foreground ring-2 ring-offset-2 ring-offset-background",
                )}
              >
                {isDone ? <Check className="size-4" strokeWidth={3} aria-hidden /> : LETTERS[i]}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
