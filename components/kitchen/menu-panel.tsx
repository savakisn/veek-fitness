"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ListPlus, Trash2, Clock, Beef, Star, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addSavedToGrocery, deleteSavedRecipe, addMealToPlan } from "@/app/kitchen/actions";
import type { SavedRecipe } from "@/lib/db/schema";

export function MenuPanel({ recipes, favorites = [] }: { recipes: SavedRecipe[]; favorites?: string[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [addingFav, startFav] = useTransition();

  return (
    <div className="space-y-5">
      {favorites.length > 0 && (
        <div className="space-y-2">
          <p className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide">
            <Star className="size-3.5" /> Your favorites
          </p>
          <div className="divide-y rounded-xl border">
            {favorites.map((name) => (
              <div key={name} className="flex items-center justify-between gap-2 px-3 py-2.5">
                <span className="text-sm font-medium">{name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={addingFav}
                  onClick={() =>
                    startFav(async () => {
                      const res = await addMealToPlan(name);
                      if (res.ok) {
                        toast.success("Added to this week.");
                        router.refresh();
                      } else toast.error(res.error);
                    })
                  }
                >
                  <Plus className="size-4" /> Add to week
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {recipes.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Bookmark a recipe in Cook or Plan and it lands here. Re-add it to your grocery list anytime, or remove it when you&apos;re sick of it.
        </p>
      ) : (
        <div className="space-y-3">
          {recipes.map((r) => (
        <div key={r.id} className="bg-card rounded-xl border p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-medium">{r.name}</h3>
            <button
              type="button"
              aria-label="Remove from Menu"
              onClick={() => start(async () => {
                await deleteSavedRecipe(r.id);
                router.refresh();
              })}
              className="text-muted-foreground hover:text-destructive p-1"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
          {r.blurb && <p className="text-muted-foreground mt-0.5 text-sm">{r.blurb}</p>}
          <div className="text-muted-foreground mt-2 flex items-center gap-3 text-xs">
            {r.proteinGrams != null && (
              <span className="flex items-center gap-1">
                <Beef className="size-3.5" /> {r.proteinGrams}g
              </span>
            )}
            {r.prepMinutes != null && (
              <span className="flex items-center gap-1">
                <Clock className="size-3.5" /> {r.prepMinutes}m
              </span>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            className="mt-3"
            onClick={() => start(async () => {
              const res = await addSavedToGrocery(r.id);
              if (res.ok) toast.success(res.added > 0 ? `Added ${res.added} to your list.` : "Already on your list.");
              else toast.error(res.error);
              router.refresh();
            })}
          >
            <ListPlus className="size-4" /> Add to list
          </Button>
        </div>
          ))}
        </div>
      )}
    </div>
  );
}
