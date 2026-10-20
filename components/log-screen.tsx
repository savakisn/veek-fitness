"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { LogForm } from "@/components/log-form";
import { parseQuickLog } from "@/app/log/actions";
import type { ParsedLog } from "@/lib/ai/quick-log";

// "Tell Cadence": one sentence in, the form below prefilled for a quick check.
// The box only exists when the server has a key, and offline it steps aside; the
// normal form underneath always works on its own.
export function LogScreen({ aiEnabled }: { aiEnabled: boolean }) {
  const [text, setText] = useState("");
  const [prefill, setPrefill] = useState<ParsedLog | null>(null);
  const [version, setVersion] = useState(0);
  const [parsing, startParse] = useTransition();

  function parse() {
    if (!text.trim()) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      toast.message("You're offline. Fill in the form below.");
      return;
    }
    startParse(async () => {
      try {
        const res = await parseQuickLog(text);
        if (res.ok) {
          setPrefill(res.parsed);
          setVersion((v) => v + 1);
        } else {
          toast.error(res.error);
        }
      } catch {
        toast.error("Couldn't reach the assistant. Use the form below.");
      }
    });
  }

  return (
    <div className="space-y-6">
      {aiEnabled && (
        <div className="space-y-2">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            maxLength={600}
            placeholder="Tell Cadence, e.g. 45 min disc golf, back a little tight after, felt like a 3"
          />
          <Button variant="secondary" className="h-11 w-full" onClick={parse} disabled={parsing || !text.trim()}>
            <Sparkles className="mr-2 size-4" />
            {parsing ? "Reading…" : "Fill in the form"}
          </Button>
          {prefill && <p className="text-muted-foreground text-xs">Check the details below, then save.</p>}
        </div>
      )}
      <LogForm key={version} prefill={prefill} />
    </div>
  );
}
