"use client";

import { BarChart, Bar, XAxis, ResponsiveContainer, Cell } from "recharts";

export function StepsTrend({ data }: { data: { date: string; value: number }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const points = data.map((d) => ({
    label: new Date(d.date + "T00:00:00").toLocaleDateString(undefined, { weekday: "narrow" }),
    value: d.value,
  }));
  return (
    <div className="h-16 w-full">
      <ResponsiveContainer>
        <BarChart data={points} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <XAxis dataKey="label" tick={{ fontSize: 9 }} stroke="var(--muted-foreground)" axisLine={false} tickLine={false} />
          <Bar dataKey="value" radius={[2, 2, 0, 0]}>
            {points.map((p, i) => (
              <Cell key={i} fill={p.value >= max ? "var(--primary)" : "var(--muted-foreground)"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
