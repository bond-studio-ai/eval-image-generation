"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ReliabilityData } from "@/lib/service-client";

interface TrendRow {
  totalRuns: number;
  failedRuns: number;
  timedOutSteps: number;
  judgeFailures: number;
}

interface TrendTooltipProps {
  active?: boolean;
  label?: string | number;
  payload?: { payload: TrendRow }[];
}

function TrendTooltip({ active, payload, label }: TrendTooltipProps) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  return (
    <div className="border-border bg-surface text-caption shadow-popover rounded-md border px-3 py-2">
      <p className="text-text-primary font-medium">{label}</p>
      <p className="text-text-secondary mt-1">
        {row.totalRuns} runs · {row.failedRuns} failed
      </p>
      <p className="text-text-muted">
        {row.timedOutSteps} timeouts · {row.judgeFailures} judge failures
      </p>
    </div>
  );
}

export function ReliabilityTrendChartGraph({ trends }: { trends: ReliabilityData["trends"] }) {
  const chartData = trends.map((trend) => {
    const date = new Date(trend.period);
    return {
      label: `${date.getMonth() + 1}/${date.getDate()}`,
      failedRuns: trend.failedRuns,
      otherRuns: Math.max(0, trend.totalRuns - trend.failedRuns),
      totalRuns: trend.totalRuns,
      timedOutSteps: trend.timedOutSteps,
      judgeFailures: trend.judgeFailures
    };
  });

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid stroke="var(--color-border)" vertical={false} />
        <XAxis dataKey="label" interval="preserveStartEnd" tick={{ fontSize: 11 }} stroke="var(--color-text-disabled)" tickLine={false} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="var(--color-text-disabled)" tickLine={false} />
        <Tooltip content={<TrendTooltip />} cursor={{ fill: "var(--color-surface-sunken)" }} />
        <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
        <Bar dataKey="failedRuns" stackId="runs" name="Failed runs" fill="var(--color-danger-400)" />
        <Bar dataKey="otherRuns" stackId="runs" name="Other runs" fill="var(--color-border-strong)" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
