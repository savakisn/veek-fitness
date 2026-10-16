"use client";

import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { ListPlus, Trash2, Clock, Beef, Star, ChevronDown, ExternalLink, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addSavedToGrocery, deleteSavedRecipe, toggleFavorite, importFavorite } from "@/app/kitchen/actions";
import { cn } from "@/lib/utils";
import type { SavedRecipe } from "@/lib/db/schema";

function searchUrl(name: string) {
  return `https://www.google.com/search?q=${encodeURIComponent(name + " recipe")}`;
}

function RecipeCard({ r }: { r: SavedRecipe }) {
  const [pending, start] = useTransition();
  const [, startEdit] = useTransition();
  const [open, setOpen] = useState(false);
  // Star and delete show instantly; revalidation re-sorts or drops the card for real.
  const [favorite, setFavorite] = useOptimistic(r.favorite);
  const [removed, setRemoved] = useOptimistic(false);

  if (removed) return null;

  return (
    <div className="bg-card rounded-xl border p-4">
      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 font-medium">{r.name}</h3>
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            aria-label={favorite ? "Remove favorite" : "Mark favorite"}
            aria-pressed={favorite}
            onClick={() => startEdit(async () => {
              setFavorite(!favorite);
              await toggleFavorite(r.id, !favorite);
            })}
            className={cn("p-2", favorite ? "text-primary" : "text-muted-foreground hover:text-foreground")}
          >
            <Star className={cn("size-4", favorite && "fill-current")} />
          </button>
          <button
            type="button"
            aria-label="Remove from Menu"
            onClick={() => startEdit(async () => {
              setRemoved(true);
              await deleteSavedRecipe(r.id);
            })}
            className="text-muted-foreground hover:text-destructive p-2"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
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

      {(r.items?.length > 0 || r.steps?.length) && (
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="text-muted-foreground hover:text-foreground mt-2 flex items-center gap-1 text-xs font-medium"
        >
          <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
          {open ? "Hide recipe" : "Show recipe"}
        </button>
      )}
      {open && (
        <div className="mt-2 space-y-2">
          {r.items?.length > 0 && (
            <ul className="text-muted-foreground space-y-0.5 text-sm">
              {r.items.map((ing, j) => (
                <li key={j}>
                  • {ing.quantity ? `${ing.quantity} ` : ""}
                  {ing.item}
                </li>
              ))}
            </ul>
          )}
          {r.steps && r.steps.length > 0 && (
            <ol className="text-muted-foreground list-decimal space-y-0.5 pl-4 text-sm">
              {r.steps.map((s, j) => (
                <li key={j}>{s}</li>
              ))}
            </ol>
          )}
          <a
            href={searchUrl(r.name)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary inline-flex items-center gap-1 text-xs font-medium"
          >
            See real versions <ExternalLink className="size-3" />
          </a>
        </div>
      )}

      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        className="mt-3"
        onClick={() => start(async () => {
          const res = await addSavedToGrocery(r.id);
          if (res.ok) toast.success(res.added > 0 ? `Added ${res.added} to your list.` : "Already on your list.");
          else toast.error(res.error);
        })}
      >
        <ListPlus className="size-4" /> Add to list
      </Button>
    </div>
  );
}

export function MenuPanel({ recipes, pendingFavorites = [] }: { recipes: SavedRecipe[]; pendingFavorites?: string[] }) {
  const [importing, startImport] = useTransition();
  const favorites = recipes.filter((r) => r.favorite);
  const rest = recipes.filter((r) => !r.favorite);

  return (
    <div className="space-y-5">
      {pendingFavorites.length > 0 && (
        <div className="bg-card space-y-2 rounded-xl border border-dashed p-3">
          <p className="text-muted-foreground text-xs">
            Add recipes for your favorites so they show up here with ingredients and steps.
          </p>
          <div className="flex flex-wrap gap-2">
            {pendingFavorites.map((name) => (
              <Button
                key={name}
                variant="outline"
                size="sm"
                disabled={importing}
                onClick={() => startImport(async () => {
                  const res = await importFavorite(name);
                  if (res.ok) {
                    toast.success(`Added ${name}.`);
                  } else toast.error(res.error);
                })}
              >
                <Plus className="size-4" /> {name}
              </Button>
            ))}
          </div>
        </div>
      )}

      {favorites.length > 0 && (
        <div className="space-y-2">
          <p className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide">
            <Star className="size-3.5 fill-current" /> Favorites
          </p>
          {favorites.map((r) => (
            <RecipeCard key={r.id} r={r} />
          ))}
        </div>
      )}

      {rest.length > 0 && (
        <div className="space-y-2">
          {favorites.length > 0 && (
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">All recipes</p>
          )}
          {rest.map((r) => (
            <RecipeCard key={r.id} r={r} />
          ))}
        </div>
      )}

      {recipes.length === 0 && pendingFavorites.length === 0 && (
        <p className="text-muted-foreground text-sm">
          Bookmark a recipe in Cook or Plan and it lands here. Star it to pin it to Favorites.
        </p>
      )}
    </div>
  );
}
