"use client";

import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { ListPlus, Share2, Trash2, Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  buildGroceryFromPlan,
  toggleGrocery,
  addGroceryItem,
  clearGrocery,
} from "@/app/kitchen/actions";
import type { GroceryItem } from "@/lib/db/schema";

// Negative ids mark optimistic rows that aren't saved yet.
let tempId = 0;
const nextTempId = () => --tempId;

type Change =
  | { type: "toggle"; id: number; checked: boolean }
  | { type: "add"; name: string }
  | { type: "clear" };

function apply(items: GroceryItem[], c: Change): GroceryItem[] {
  if (c.type === "toggle") return items.map((i) => (i.id === c.id ? { ...i, checked: c.checked } : i));
  if (c.type === "clear") return [];
  const temp: GroceryItem = { id: nextTempId(), name: c.name, quantity: null, checked: false, createdAt: new Date() };
  return [temp, ...items];
}

// Every tap shows its result immediately (useOptimistic); the server action's
// revalidation then re-renders the list in its real order, so a checked item
// settles to the bottom a moment later. No router.refresh: the action response
// already carries the re-render.
export function GroceryPanel({ items, hasPlan }: { items: GroceryItem[]; hasPlan: boolean }) {
  const [adding, setAdding] = useState("");
  const [list, change] = useOptimistic(items, apply);
  const [building, startBuild] = useTransition();
  const [, start] = useTransition();

  function toggle(item: GroceryItem) {
    if (item.id < 0) return; // not saved yet
    start(async () => {
      change({ type: "toggle", id: item.id, checked: !item.checked });
      await toggleGrocery(item.id, !item.checked);
    });
  }

  function build() {
    startBuild(async () => {
      const res = await buildGroceryFromPlan();
      if (!res.ok) toast.error(res.error);
      else toast.success(`${res.count} items added from your plan.`);
    });
  }

  function add() {
    const name = adding.trim();
    if (!name) return;
    setAdding("");
    start(async () => {
      change({ type: "add", name });
      await addGroceryItem(name);
    });
  }

  function clear() {
    start(async () => {
      change({ type: "clear" });
      await clearGrocery();
    });
  }

  async function share() {
    const text = list.map((i) => `- ${i.name}${i.quantity ? ` (${i.quantity})` : ""}`).join("\n");
    const payload = `Grocery list\n${text}`;
    try {
      if (navigator.share) await navigator.share({ title: "Grocery list", text: payload });
      else {
        await navigator.clipboard.writeText(payload);
        toast.success("Copied to clipboard.");
      }
    } catch {
      /* user dismissed share sheet */
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button onClick={build} disabled={building} variant="outline" className="h-11 flex-1">
          <ListPlus className="size-4" /> {building ? "Building…" : "Build from plan"}
        </Button>
        <Button onClick={share} disabled={list.length === 0} variant="outline" className="h-11">
          <Share2 className="size-4" /> Share
        </Button>
      </div>
      {!hasPlan && <p className="text-muted-foreground text-xs">Generate a meal plan first, then build the list from it.</p>}

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <Input
          value={adding}
          onChange={(e) => setAdding(e.target.value)}
          placeholder="Add an item"
          enterKeyHint="done"
          className="h-11"
        />
        <Button type="submit" size="icon" variant="outline" className="size-11" aria-label="Add item">
          <Plus className="size-4" />
        </Button>
      </form>

      {list.length === 0 ? (
        <p className="text-muted-foreground text-sm">Your list is empty.</p>
      ) : (
        <ul className="divide-y rounded-xl border">
          {list.map((i) => (
            <li key={i.id}>
              <button
                type="button"
                role="checkbox"
                aria-checked={i.checked}
                onClick={() => toggle(i)}
                className="active:bg-accent/40 flex min-h-12 w-full items-center gap-3 px-4 py-2.5 text-left transition-colors"
              >
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors",
                    i.checked ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40",
                  )}
                >
                  <Check className={cn("size-4 transition-transform duration-150", i.checked ? "scale-100" : "scale-0")} />
                </span>
                <span className={cn("flex-1 text-sm transition-colors", i.checked && "text-muted-foreground line-through")}>
                  {i.name}
                  {i.quantity ? <span className="text-muted-foreground"> · {i.quantity}</span> : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {list.length > 0 && (
        <button
          type="button"
          onClick={clear}
          className="text-muted-foreground active:text-destructive -mx-2 flex min-h-11 items-center gap-1 px-2 text-xs"
        >
          <Trash2 className="size-3.5" /> Clear list
        </button>
      )}
    </div>
  );
}
