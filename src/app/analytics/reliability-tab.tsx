'use client';

import { browserTimezone, serviceUrl } from '@/lib/api-base';
import type { ReliabilityData } from '@/lib/service-client';
import { useCallback, useEffect, useState } from 'react';

interface ReliabilityTabProps {
  from?: string;
  to?: string;
  model?: string;
  source?: string;
}

function StatCard({ label, value, subtext }: { label: string; value: string | number; subtext?: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-xs">
      <p className="text-sm font-medium text-gray-600">{label}</p>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
      {subtext && <p className="mt-1 text-xs text-gray-500">{subtext}</p>}
    </div>
  );
}

function ErrorTable({ title, errors }: { title: string; errors: { reason: string; count: number }[] }) {
  if (errors.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-xs">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <p className="mt-3 text-sm text-gray-400">No errors in this period.</p>
      </div>
    );
  }

  const maxCount = Math.max(...errors.map((e) => e.count), 1);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-xs">
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      <div className="mt-4 space-y-3">
        {errors.map((err, i) => (
          <div key={i}>
            <div className="flex items-center justify-between text-sm">
              <span className="max-w-md truncate text-gray-700" title={err.reason}>
                {err.reason}
              </span>
              <span className="ml-4 shrink-0 font-mono text-sm font-medium text-gray-900">{err.count}</span>
            </div>
            <div className="mt-1 h-2 w-full rounded-full bg-gray-100">
              <div
                className="h-2 rounded-full bg-red-400 transition-all duration-300"
                style={{ width: `${(err.count / maxCount) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrendChart({ trends }: { trends: ReliabilityData['trends'] }) {
  if (trends.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-xs">
        <h3 className="text-sm font-semibold text-gray-900">Failure Trends</h3>
        <p className="mt-3 text-sm text-gray-400">No data available for this period.</p>
      </div>
    );
  }

  const maxRuns = Math.max(...trends.map((t) => t.totalRuns), 1);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-xs">
      <h3 className="text-sm font-semibold text-gray-900">Daily Failure Trends</h3>
      <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-gray-300" /> Total runs
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-400" /> Failed runs
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400" /> Timeouts
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-purple-400" /> Judge failures
        </span>
      </div>
      <div className="mt-4 flex items-end gap-1" style={{ height: 160 }}>
        {trends.map((t, i) => {
          const totalH = (t.totalRuns / maxRuns) * 100;
          const failedH = t.totalRuns > 0 ? (t.failedRuns / t.totalRuns) * totalH : 0;
          const date = new Date(t.period);
          const label = `${date.getMonth() + 1}/${date.getDate()}`;
          return (
            <div key={i} className="group relative flex flex-1 flex-col items-center" title={`${label}: ${t.totalRuns} runs, ${t.failedRuns} failed, ${t.timedOutSteps} timeouts, ${t.judgeFailures} judge failures`}>
              <div className="relative w-full" style={{ height: `${totalH}%`, minHeight: t.totalRuns > 0 ? 4 : 0 }}>
                <div className="absolute bottom-0 w-full rounded-t bg-gray-200" style={{ height: '100%' }} />
                <div className="absolute bottom-0 w-full rounded-t bg-red-400" style={{ height: `${failedH}%` }} />
              </div>
              {i % Math.max(1, Math.floor(trends.length / 10)) === 0 && (
                <span className="mt-1 text-[9px] text-gray-400">{label}</span>
              )}
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
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      if (model) params.set('model', model);
      if (source && source !== 'all') params.set('source', source);
      const tz = browserTimezone();
      if (tz) params.set('tz', tz);
      const qs = params.toString();
      const res = await fetch(serviceUrl(`analytics/reliability${qs ? `?${qs}` : ''}`), {
        cache: 'no-store',
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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-primary-600" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
        Failed to load reliability data.
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Total Runs" value={data.summary.totalRuns} />
        <StatCard
          label="Run Failure Rate"
          value={`${data.summary.failureRate}%`}
          subtext={`${data.summary.failedRuns} failed of ${data.summary.totalRuns}`}
        />
        <StatCard
          label="Step Timeout Rate"
          value={`${data.generationErrors.timeoutRate}%`}
          subtext={`${data.generationErrors.timedOutSteps} timed out of ${data.generationErrors.totalSteps}`}
        />
        <StatCard
          label="Step Failure Rate"
          value={`${data.generationErrors.failureRate}%`}
          subtext={`${data.generationErrors.failedSteps} failed of ${data.generationErrors.totalSteps}`}
        />
        <StatCard
          label="Judge Failure Rate"
          value={`${data.judgeErrors.judgeFailureRate}%`}
          subtext={`${data.judgeErrors.failedJudges} failed of ${data.judgeErrors.totalJudged}`}
        />
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
