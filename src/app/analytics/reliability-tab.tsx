"use client";

import { useCallback, useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AccuracyTrendChart } from "@/app/analytics/accuracy-trend-chart";
import { browserTimezone, serviceUrl } from "@/lib/api-base";
import { fetchJson } from "@/lib/api/client";
import { reliabilityResponseSchema } from "@/lib/api/schemas";
import { definedProps } from "@/lib/defined-props";
import type { ReliabilityData } from "@/lib/service-client";

interface ReliabilityTabProps {
  from?: string;
  to?: string;
  model?: string;
  source?: string;
}

function StatCard({ label, value, subtext }: { label: string; value: string | number; subtext?: string }) {
  return (
    <div className="border-border bg-surface rounded-lg border p-5 shadow-xs">
      <p className="text-text-secondary text-body font-medium">{label}</p>
      <p className="text-text-primary text-display-lg mt-2">{value}</p>
      {subtext && <p className="text-text-muted text-caption mt-1">{subtext}</p>}
    </div>
  );
}

function ErrorTable({ title, errors }: { title: string; errors: { reason: string; count: number }[] }) {
  if (errors.length === 0) {
    return (
      <div className="border-border bg-surface rounded-lg border p-5 shadow-xs">
        <h3 className="text-text-primary text-body font-semibold">{title}</h3>
        <p className="text-text-disabled text-body mt-3">No errors in this period.</p>
      </div>
    );
  }

  const maxCount = Math.max(...errors.map((e) => e.count), 1);

  return (
    <div className="border-border bg-surface rounded-lg border p-5 shadow-xs">
      <h3 className="text-text-primary text-body font-semibold">{title}</h3>
      <div className="mt-4 space-y-3">
        {errors.map((err) => (
          <div key={err.reason}>
            <div className="text-body flex items-center justify-between">
              <span className="text-text-secondary max-w-md truncate" title={err.reason}>
                {err.reason}
              </span>
              <span className="text-text-primary text-body ml-4 shrink-0 font-mono font-medium">{err.count}</span>
            </div>
            <div className="bg-surface-sunken mt-1 h-2 w-full rounded-full">
              <div className="bg-danger-400 h-2 rounded-full transition-all duration-300" style={{ width: `${(err.count / maxCount) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

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

function TrendChart({ trends }: { trends: ReliabilityData["trends"] }) {
  if (trends.length === 0) {
    return (
      <div className="border-border bg-surface rounded-lg border p-5 shadow-xs">
        <h3 className="text-text-primary text-body font-semibold">Failure Trends</h3>
        <p className="text-text-disabled text-body mt-3">No data available for this period.</p>
      </div>
    );
  }

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
    <div className="border-border bg-surface rounded-lg border p-5 shadow-xs">
      <h3 className="text-text-primary text-body font-semibold">Daily Failure Trends</h3>
      <div className="mt-4" style={{ height: 200 }}>
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
      </div>
    </div>
  );
}

export function ReliabilityTab({ from, to, model, source }: ReliabilityTabProps) {
  const [data, setData] = useState<ReliabilityData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (model) params.set("model", model);
      if (source && source !== "all") params.set("source", source);
      const tz = browserTimezone();
      if (tz) params.set("tz", tz);
      const qs = params.toString();
      const suffix = qs ? `?${qs}` : "";
      const json = await fetchJson(serviceUrl(`analytics/reliability${suffix}`), reliabilityResponseSchema, { cache: "no-store" });
      setData(json.data ?? null);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [from, to, model, source]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="mt-6 flex items-center justify-center py-12">
        <div className="border-t-primary-600 border-border-strong size-8 animate-spin rounded-full border-4" />
      </div>
    );
  }

  if (!data) {
    return <div className="border-border bg-surface text-text-muted text-body mt-6 rounded-lg border p-6 text-center">Failed to load reliability data.</div>;
  }

  return (
    <div className="mt-6 space-y-6">
      {/* Accuracy trend chart */}
      <AccuracyTrendChart {...definedProps({ from, to, model, source })} />

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Total Runs" value={data.summary.totalRuns} />
        <StatCard label="Run Failure Rate" value={`${data.summary.failureRate}%`} subtext={`${data.summary.failedRuns} failed of ${data.summary.totalRuns}`} />
        <StatCard label="Step Timeout Rate" value={`${data.generationErrors.timeoutRate}%`} subtext={`${data.generationErrors.timedOutSteps} timed out of ${data.generationErrors.totalSteps}`} />
        <StatCard label="Step Failure Rate" value={`${data.generationErrors.failureRate}%`} subtext={`${data.generationErrors.failedSteps} failed of ${data.generationErrors.totalSteps}`} />
        <StatCard label="Judge Failure Rate" value={`${data.judgeErrors.judgeFailureRate}%`} subtext={`${data.judgeErrors.failedJudges} failed of ${data.judgeErrors.totalJudged}`} />
      </div>

      {/* Trend chart */}
      <TrendChart trends={data.trends} />

      {/* Error breakdown tables */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ErrorTable title="Top Generation Errors" errors={data.generationErrors.errorBreakdown} />
        <ErrorTable title="Top Judge Errors" errors={data.judgeErrors.errorBreakdown} />
      </div>
    </div>
  );
}
