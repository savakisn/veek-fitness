"use client";

import { useRef, useTransition } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { deleteWorkout } from "@/app/actions";

// Hides its row on tap so the delete feels instant; the action's revalidation
// then removes it for real. If the delete fails, the row comes back.
export function DeleteWorkoutButton({ id }: { id: number }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [pending, start] = useTransition();

  function remove() {
    const row = ref.current?.closest("li");
    row?.classList.add("hidden");
    start(async () => {
      try {
        await deleteWorkout(id);
        toast.success("Removed.");
      } catch {
        row?.classList.remove("hidden");
        toast.error("Couldn't remove it. Try again.");
      }
    });
  }

  return (
    <button
      ref={ref}
      aria-label="Delete"
      disabled={pending}
      onClick={remove}
      className="text-muted-foreground hover:text-destructive -mr-2 p-2.5 disabled:opacity-50"
    >
      <Trash2 className="size-4" />
    </button>
  );
}
