"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { logWeight } from "@/app/actions";

export function LogWeight() {
  const router = useRouter();
  const [val, setVal] = useState("");
  const [pending, startT] = useTransition();

  function save() {
    const lbs = Number.parseFloat(val);
    if (!(lbs > 0)) {
      toast.error("Enter a weight.");
      return;
    }
    startT(async () => {
      await logWeight(lbs);
      setVal("");
      toast.success("Weight logged.");
      router.refresh();
    });
  }

  return (
    <div className="bg-card flex items-center gap-2 rounded-xl border p-3">
      <input
        type="number"
        inputMode="decimal"
        step="0.1"
        placeholder="Today's weight"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        className="border-input bg-background h-10 w-full rounded-lg border px-3 text-sm tabular-nums outline-none"
      />
      <span className="text-muted-foreground text-sm">lb</span>
      <Button onClick={save} disabled={pending || !val} size="sm" className="shrink-0">
        Log
      </Button>
    </div>
  );
}
