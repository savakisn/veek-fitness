"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export function HrChart({ samples }: { samples: { t: number; hr: number }[] }) {
  const data = samples.map((s) => ({ min: Math.round((s.t / 60) * 10) / 10, hr: s.hr }));
  return (
    <div className="bg-card rounded-xl border p-4">
      <p className="text-muted-foreground mb-3 text-xs font-medium uppercase tracking-wide">Heart rate</p>
      <div className="h-40 w-full">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 4, right: 6, bottom: 0, left: -18 }}>
            <XAxis
              dataKey="min"
              type="number"
              domain={["dataMin", "dataMax"]}
              tickFormatter={(v) => `${Math.round(v)}m`}
              tick={{ fontSize: 10 }}
              stroke="var(--muted-foreground)"
            />
            <YAxis
              width={34}
              tick={{ fontSize: 10 }}
              stroke="var(--muted-foreground)"
              domain={["dataMin-5", "dataMax+5"]}
            />
            <Tooltip
              contentStyle={{
                background: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Line type="monotone" dataKey="hr" stroke="var(--primary)" dot={false} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
