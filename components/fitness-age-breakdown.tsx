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
        {b.vo2Source === "estimated" && b.hrRest != null && <Row label="Resting HR" value={`${b.hrRest} bpm`} />}
        {b.vo2Source === "estimated" && b.hrMax != null && <Row label="Max HR" value={`${b.hrMax} bpm`} />}
        <Row label="VO₂max" value={String(b.vo2max)} note={b.vo2Source === "garmin" ? "from Garmin" : "estimated"} />
        {b.faSource === "derived" && <Row label="VO₂max age" value={`${b.baseAge} yrs`} note="vs male norms" />}
        {b.bmi != null && (
          <Row label="BMI" value={String(b.bmi)} note={b.faSource === "derived" && b.bmiAdjust ? `+${b.bmiAdjust} yrs` : undefined} />
        )}
        <Row
          label="Fitness age"
          value={`${b.fitnessAge} yrs`}
          note={b.faSource === "garmin" ? "from Garmin" : delta <= 0 ? `${delta} vs age` : `+${delta} vs age`}
        />
      </div>

      <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
        {b.faSource === "garmin"
          ? "Fitness age is Garmin's own figure (from your VO₂max), shown here live. VO₂max and BMI are context."
          : b.vo2Source === "garmin"
            ? "Derived from Garmin's VO₂max mapped to male population norms, adjusted for BMI."
            : "VO₂max is estimated from your resting and max heart rate (Garmin's wasn't available yet), mapped to male norms and adjusted for BMI. It sharpens once Garmin computes a VO₂max from a run or ride."}
      </p>
    </div>
  );
}
