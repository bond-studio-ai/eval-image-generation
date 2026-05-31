"use client";

import { useCallback, useEffect, useState } from "react";
import { AccuracyTrendChart } from "@/app/analytics/accuracy-trend-chart";
import { browserTimezone, serviceUrl } from "@/lib/api-base";
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
        {errors.map((err, index) => (
          <div key={`${index}-${err.reason}`}>
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

function TrendChart({ trends }: { trends: ReliabilityData["trends"] }) {
  if (trends.length === 0) {
    return (
      <div className="border-border bg-surface rounded-lg border p-5 shadow-xs">
        <h3 className="text-text-primary text-body font-semibold">Failure Trends</h3>
        <p className="text-text-disabled text-body mt-3">No data available for this period.</p>
      </div>
    );
  }

  const maxRuns = Math.max(...trends.map((trend) => trend.totalRuns), 1);

  return (
    <div className="border-border bg-surface rounded-lg border p-5 shadow-xs">
      <h3 className="text-text-primary text-body font-semibold">Daily Failure Trends</h3>
      <div className="text-text-muted text-caption mt-2 flex items-center gap-4">
        <span className="flex items-center gap-1.5">
          <span className="bg-border-strong inline-block size-2.5 rounded-full" /> Total runs
        </span>
        <span className="flex items-center gap-1.5">
          <span className="bg-danger-400 inline-block size-2.5 rounded-full" /> Failed runs
        </span>
        <span className="flex items-center gap-1.5">
          <span className="bg-warning-400 inline-block size-2.5 rounded-full" /> Timeouts
        </span>
        <span className="flex items-center gap-1.5">
          <span className="bg-accent-400 inline-block size-2.5 rounded-full" /> Judge failures
        </span>
      </div>
      <div className="mt-4 flex items-end gap-1" style={{ height: 160 }}>
        {trends.map((trend, i) => {
          const totalH = (trend.totalRuns / maxRuns) * 100;
          const failedH = trend.totalRuns > 0 ? (trend.failedRuns / trend.totalRuns) * totalH : 0;
          const date = new Date(trend.period);
          const label = `${date.getMonth() + 1}/${date.getDate()}`;
          return (
            <div
              key={trend.period}
              className="group relative flex flex-1 flex-col items-center"
              title={`${label}: ${trend.totalRuns} runs, ${trend.failedRuns} failed, ${trend.timedOutSteps} timeouts, ${trend.judgeFailures} judge failures`}
            >
              <div className="relative w-full" style={{ height: `${totalH}%`, minHeight: trend.totalRuns > 0 ? 4 : 0 }}>
                <div className="bg-border absolute bottom-0 w-full rounded-t" style={{ height: "100%" }} />
                <div className="bg-danger-400 absolute bottom-0 w-full rounded-t" style={{ height: `${failedH}%` }} />
              </div>
              {i % Math.max(1, Math.floor(trends.length / 10)) === 0 && <span className="text-text-disabled mt-1 text-[9px]">{label}</span>}
            </div>
          );
        })}
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
      const res = await fetch(serviceUrl(`analytics/reliability${qs ? `?${qs}` : ""}`), {
        cache: "no-store"
      });
      if (!res.ok) return;
      const json = await res.json();
      setData(json.data ?? null);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [from, to, model, source]);

  useEffect(() => {
    fetchData();
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
