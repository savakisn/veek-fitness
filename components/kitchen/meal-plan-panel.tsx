"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sparkles, Clock, Beef } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateMealPlan } from "@/app/kitchen/actions";
import type { WeeklyMealPlan } from "@/lib/ai/prompts";

export function MealPlanPanel({ plan }: { plan: WeeklyMealPlan | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function run() {
    start(async () => {
      const res = await generateMealPlan();
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Fresh plan ready.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        A week of easy, high-protein dinners that ease you up from where you are — no kale cliff.
      </p>
      <Button onClick={run} disabled={pending} className="h-11 w-full">
        <Sparkles className="size-4" /> {pending ? "Cooking up a plan…" : plan ? "Regenerate plan" : "Generate this week's plan"}
      </Button>

      {plan ? (
        <div className="space-y-3">
          {plan.days?.map((d, i) => (
            <div key={i} className="bg-card rounded-xl border p-4">
              <div className="flex items-baseline justify-between">
                <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">{d.day}</span>
                <span className="text-muted-foreground flex items-center gap-2 text-xs">
                  <span className="flex items-center gap-1">
                    <Beef className="size-3.5" /> {d.meal.proteinGrams}g
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="size-3.5" /> {d.meal.prepMinutes}m
                  </span>
                </span>
              </div>
              <h3 className="mt-1 font-medium">{d.meal.name}</h3>
              {d.meal.blurb && <p className="text-muted-foreground mt-0.5 text-sm">{d.meal.blurb}</p>}
              {d.meal.steps?.length > 0 && (
                <ol className="text-muted-foreground mt-2 list-decimal space-y-0.5 pl-4 text-sm">
                  {d.meal.steps.map((s, j) => (
                    <li key={j}>{s}</li>
                  ))}
                </ol>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">No plan yet. Generate one and it&apos;ll feed your grocery list.</p>
      )}
    </div>
  );
}
