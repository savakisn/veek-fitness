"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { deleteWorkout } from "@/app/actions";

export function DeleteWorkoutButton({ id }: { id: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      aria-label="Delete"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await deleteWorkout(id);
          toast.success("Removed.");
          router.refresh();
        })
      }
      className="text-muted-foreground hover:text-destructive p-1 disabled:opacity-50"
    >
      <Trash2 className="size-4" />
    </button>
  );
}
