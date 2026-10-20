"use client";

import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { deleteWorkout } from "@/app/actions";

// A History row that disappears the moment you tap delete. useOptimistic rolls it
// back on its own if the delete fails; the action's revalidation removes it for real.
export function DeletableWorkoutRow({ id, children }: { id: number; children: React.ReactNode }) {
  const [removed, setRemoved] = useOptimistic(false);
  const [, start] = useTransition();

  if (removed) return null;

  function remove() {
    start(async () => {
      setRemoved(true);
      try {
        await deleteWorkout(id);
        toast.success("Removed.");
      } catch {
        toast.error("Couldn't remove it. Try again.");
      }
    });
  }

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      {children}
      <button
        type="button"
        aria-label="Delete"
        onClick={remove}
        className="text-muted-foreground hover:text-destructive -mr-2 p-2.5"
      >
        <Trash2 className="size-4" />
      </button>
    </li>
  );
}
