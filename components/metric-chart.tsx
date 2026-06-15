"use client";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export function MetricChart({
  data,
  variant,
}: {
  data: { date: string; value: number }[];
  variant: "bar" | "line";
}) {
  const points = data.map((d) => ({
    label: new Date(d.date + "T00:00:00").toLocaleDateString(undefined, { month: "numeric", day: "numeric" }),
    value: d.value,
  }));

  const axis = (
    <>
      <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" tickLine={false} />
      <YAxis width={36} tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" domain={["dataMin-2", "dataMax+2"]} />
      <Tooltip
        contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
      />
    </>
  );

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer>
        {variant === "bar" ? (
          <BarChart data={points} margin={{ top: 4, right: 6, bottom: 0, left: -16 }}>
            {axis}
            <Bar dataKey="value" fill="var(--primary)" radius={[3, 3, 0, 0]} />
          </BarChart>
        ) : (
          <LineChart data={points} margin={{ top: 4, right: 6, bottom: 0, left: -16 }}>
            {axis}
            <Line type="monotone" dataKey="value" stroke="var(--primary)" dot={{ r: 2 }} strokeWidth={2} />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
