const dayFmt = new Intl.DateTimeFormat("en-US", { weekday: "narrow", timeZone: "UTC" });

// Seven bars, so plain markup instead of a chart library: keeps recharts out of
// the Today bundle. The best day is highlighted.
export function StepsTrend({ data }: { data: { date: string; value: number }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex h-16 w-full items-end gap-1.5" role="img" aria-label="Steps for the last 7 days">
      {data.map((d) => (
        <div key={d.date} className="flex h-full flex-1 flex-col items-center gap-1">
          <div className="flex w-full flex-1 items-end">
            <div
              className={d.value >= max ? "bg-primary w-full rounded-t-sm" : "bg-muted-foreground/60 w-full rounded-t-sm"}
              style={{ height: `${Math.max(4, (d.value / max) * 100)}%` }}
            />
          </div>
          <span className="text-muted-foreground text-[9px] leading-none">
            {dayFmt.format(new Date(d.date + "T00:00:00Z"))}
          </span>
        </div>
      ))}
    </div>
  );
}
