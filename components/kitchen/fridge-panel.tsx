"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChefHat, Clock, Beef, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fridgeToRecipe, addPantryItem, deletePantryItem } from "@/app/kitchen/actions";
import { MealRating, type Sentiment } from "./meal-rating";
import type { RecipeSuggestion } from "@/lib/ai/prompts";
import type { PantryItem } from "@/lib/db/schema";

export function FridgePanel({
  pantry,
  feedback,
}: {
  pantry: PantryItem[];
  feedback: Record<string, Sentiment>;
}) {
  const router = useRouter();
  const [recipes, setRecipes] = useState<RecipeSuggestion[] | null>(null);
  const [adding, setAdding] = useState("");
  const [pending, start] = useTransition();

  function add() {
    const name = adding.trim();
    if (!name) return;
    setAdding("");
    start(async () => {
      await addPantryItem({ name });
      router.refresh();
    });
  }

  function run() {
    start(async () => {
      const res = await fridgeToRecipe();
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setRecipes(res.recipes);
      if (res.recipes.length === 0) toast("Nothing came back — add a few more items.");
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium">What&apos;s on hand</p>
        <div className="mt-2 flex gap-2">
          <Input
            value={adding}
            onChange={(e) => setAdding(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="Add an item (e.g. chicken thighs)"
          />
          <Button onClick={add} size="icon" variant="outline">
            <Plus className="size-4" />
          </Button>
        </div>
        {pantry.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {pantry.map((i) => (
              <span key={i.id} className="bg-muted/50 flex items-center gap-1 rounded-full border px-2.5 py-1 text-sm">
                {i.name}
                <button
                  aria-label="Remove"
                  onClick={() => start(async () => {
                    await deletePantryItem(i.id);
                    router.refresh();
                  })}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="size-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <Button onClick={run} disabled={pending || pantry.length === 0} className="h-11 w-full">
        <ChefHat className="size-4" /> {pending ? "Thinking…" : "What can I make?"}
      </Button>
      {pantry.length === 0 && (
        <p className="text-muted-foreground text-xs">Add a few items above and it&apos;ll suggest easy, high-protein meals.</p>
      )}

      <div className="space-y-3">
        {recipes?.map((r, i) => (
          <div key={i} className="bg-card rounded-xl border p-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-medium">{r.name}</h3>
              <MealRating name={r.name} current={feedback[r.name] ?? null} />
            </div>
            {r.blurb && <p className="text-muted-foreground mt-0.5 text-sm">{r.blurb}</p>}
            <div className="text-muted-foreground mt-2 flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1">
                <Beef className="size-3.5" /> {r.proteinGrams}g protein
              </span>
              <span className="flex items-center gap-1">
                <Clock className="size-3.5" /> {r.prepMinutes} min
              </span>
            </div>
            {r.alsoNeed?.length > 0 && (
              <p className="mt-2 text-xs">
                <span className="text-muted-foreground">Also need: </span>
                {r.alsoNeed.join(", ")}
              </p>
            )}
            {r.steps?.length > 0 && (
              <ol className="text-muted-foreground mt-2 list-decimal space-y-0.5 pl-4 text-sm">
                {r.steps.map((s, j) => (
                  <li key={j}>{s}</li>
                ))}
              </ol>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
