import Link from "next/link";
import { ChevronRight, UtensilsCrossed } from "lucide-react";
import type { WeeklyMealPlan } from "@/lib/ai/prompts";
import { weekStartISO } from "@/lib/format";

// A plan is an ordered list of the week's dinners with no days attached, so
// tonight is the nth meal for the nth day of the week (Monday first), wrapping
// when the plan is shorter than seven nights.
export function tonightsMeal(plan: WeeklyMealPlan | null, today: string) {
  const meals = plan?.meals ?? [];
  if (meals.length === 0) return null;
  const day = Math.round((Date.parse(today) - Date.parse(weekStartISO(today))) / 86400000);
  return meals[day % meals.length];
}

export function DinnerLine({ plan, today }: { plan: WeeklyMealPlan | null; today: string }) {
  const meal = tonightsMeal(plan, today);
  return (
    <Link
      href="/kitchen"
      className="bg-card active:bg-muted flex min-h-16 items-center gap-3 rounded-2xl px-4 py-3 transition-colors"
    >
      <UtensilsCrossed className="text-muted-foreground size-5 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        {meal ? (
          <>
            <p className="text-muted-foreground text-xs">Tonight</p>
            <p className="truncate font-bold">{meal.name}</p>
            <p className="text-muted-foreground text-xs tabular-nums">
              {meal.prepMinutes} min, {meal.proteinGrams} g protein
            </p>
          </>
        ) : (
          <>
            <p className="font-bold">Nothing planned for dinner</p>
            <p className="text-muted-foreground text-xs">Plan the week in the kitchen</p>
          </>
        )}
      </div>
      <ChevronRight className="text-muted-foreground size-5 shrink-0" aria-hidden />
    </Link>
  );
}
