import type { FitnessAgeBreakdown } from "@/lib/fitness-age";

function Row({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="text-right text-sm font-medium tabular-nums">
        {value}
        {note ? <span className="text-muted-foreground ml-1 text-xs font-normal">{note}</span> : null}
      </span>
    </div>
  );
}

// Shows exactly how the fitness age number is built, step by step.
export function FitnessAgeBreakdownCard({ b }: { b: FitnessAgeBreakdown }) {
  const delta = Math.round(b.fitnessAge - b.age);
  return (
    <div className="bg-card rounded-2xl border p-4">
      <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">How it&apos;s calculated</p>

      <div className="mt-2 divide-y">
        <Row label="Your age" value={`${b.age} yrs`} />
        <Row label="Resting HR" value={`${b.hrRest} bpm`} />
        <Row
          label="Max HR"
          value={`${b.hrMax} bpm`}
          note={b.hrMaxEstimated ? "estimated" : "from activities"}
        />
        <Row label="Est. VO₂max" value={String(b.vo2max)} note="15 × HRmax/HRrest" />
        <Row label="VO₂max age" value={`${b.baseAge} yrs`} note="vs male norms" />
        {b.bmi != null && (
          <Row
            label="BMI"
            value={String(b.bmi)}
            note={b.bmiAdjust ? `+${b.bmiAdjust} yrs` : "neutral"}
          />
        )}
        <Row label="Fitness age" value={`${b.fitnessAge} yrs`} note={delta <= 0 ? `${delta} vs age` : `+${delta} vs age`} />
      </div>

      <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
        VO₂max comes from the heart-rate-ratio method, mapped to male population norms, then adjusted for BMI.
        {b.hrMaxEstimated
          ? " Max HR is age-estimated for now and will sharpen once you record a hard effort."
          : ""}
      </p>
    </div>
  );
}
