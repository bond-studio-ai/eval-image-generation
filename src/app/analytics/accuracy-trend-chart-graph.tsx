"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const Y_TICKS = [0, 20, 40, 60, 80, 100];

interface AccuracyTrendChartGraphProps {
  chartData: (Record<string, unknown> & { label: string })[];
}

export function AccuracyTrendChartGraph({ chartData }: AccuracyTrendChartGraphProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData} margin={{ top: 8, right: 24, left: 0, bottom: 4 }}>
        <CartesianGrid stroke="#e5e7eb" />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#9ca3af" tickLine={false} />
        <YAxis domain={[0, 100]} ticks={Y_TICKS} tickFormatter={(value: number) => `${value}%`} tick={{ fontSize: 12 }} stroke="#9ca3af" tickLine={false} />
        <Tooltip
          formatter={(value: unknown, name: unknown) => {
            const n = Number(value);
            return [Number.isFinite(n) ? `${n.toFixed(1)}%` : "N/A", String(name)];
          }}
          labelFormatter={(_label, payload) => {
            const point = payload?.[0]?.payload as { date?: string } | undefined;
            if (!point?.date) return String(_label);
            const [year, month, day] = point.date.split("-");
            if (year && month && day) {
              const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
              return `${months[Number(month) - 1] ?? ""} ${Number(day)}, ${year}`;
            }
            return String(_label);
          }}
          contentStyle={{
            borderRadius: "8px",
            border: "1px solid #e5e7eb",
            fontSize: "13px"
          }}
        />
        <Legend wrapperStyle={{ fontSize: "13px", paddingTop: "8px" }} />
        <Line type="linear" dataKey="sceneAccuracy" name="Scene Accuracy" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4, fill: "#3b82f6", strokeWidth: 0 }} activeDot={{ r: 6, fill: "#3b82f6", strokeWidth: 0 }} />
        <Line type="linear" dataKey="productAccuracy" name="Product Accuracy" stroke="#22c55e" strokeWidth={2} dot={{ r: 4, fill: "#22c55e", strokeWidth: 0 }} activeDot={{ r: 6, fill: "#22c55e", strokeWidth: 0 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
