"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

// Today's intraday Body Battery curve, like Garmin: charges overnight, drains
// through the day. Timestamps are GMT ms; we render them in the browser's local
// time so the curve lines up with the user's day.
export function BodyBatteryChart({ samples }: { samples: { ts: number; level: number }[] }) {
  const data = samples.map((s) => {
    const d = new Date(s.ts);
    return { hour: d.getHours() + d.getMinutes() / 60, level: s.level };
  });
  const peak = data.reduce((m, p) => (p.level > m.level ? p : m), data[0]);
  const low = data.reduce((m, p) => (p.level < m.level ? p : m), data[0]);

  return (
    <div className="bg-card rounded-2xl border p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Today</p>
        <p className="text-muted-foreground text-xs">
          High {Math.round(peak.level)} · Low {Math.round(low.level)}
        </p>
      </div>
      <div className="h-44 w-full">
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 4, right: 6, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="bb" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.5} />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="hour"
              type="number"
              domain={[0, 24]}
              ticks={[0, 6, 12, 18, 24]}
              tickFormatter={(v) => (v === 0 ? "12a" : v === 12 ? "12p" : v === 24 ? "12a" : v > 12 ? `${v - 12}p` : `${v}a`)}
              tick={{ fontSize: 10 }}
              stroke="var(--muted-foreground)"
            />
            <YAxis width={28} domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
            <ReferenceLine y={25} stroke="var(--border)" strokeDasharray="3 3" />
            <Tooltip
              contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
              labelFormatter={(v) => {
                const h = Math.floor(Number(v));
                const m = Math.round((Number(v) - h) * 60);
                return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
              }}
            />
            <Area type="monotone" dataKey="level" name="Body Battery" stroke="var(--primary)" strokeWidth={2} fill="url(#bb)" isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
