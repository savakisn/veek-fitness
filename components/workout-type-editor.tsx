"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateWorkoutType } from "@/app/actions";

export function WorkoutTypeEditor({ id, type }: { id: number; type: string }) {
  const router = useRouter();
  const [value, setValue] = useState(type);
  const [pending, start] = useTransition();

  function save() {
    start(async () => {
      await updateWorkoutType(id, value);
      toast.success("Updated.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="type">Activity label</Label>
      <p className="text-muted-foreground text-sm">
        Rename it — e.g. a Garmin &quot;Hiking&quot; that was really disc golf.
      </p>
      <div className="flex gap-2">
        <Input id="type" value={value} onChange={(e) => setValue(e.target.value)} />
        <Button onClick={save} disabled={pending || value.trim() === type}>
          Save
        </Button>
      </div>
    </div>
  );
}
