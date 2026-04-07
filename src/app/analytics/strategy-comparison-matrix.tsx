'use client';

import type { AnalyticsComparisonSlice } from '@/app/analytics/comparison-utils';
import { serviceUrl } from '@/lib/api-base';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type StrategyRow = {
  id: string;
  name: string;
  generationCount: number;
  sceneRatedCount: number;
  sceneGoodPct: number;
  sceneFailedPct: number;
  productRatedCount: number;
  productGoodPct: number;
  productFailedPct: number;
  notRatedCount: number;
  notRatedPct: number;
  avgExecTimeMs: number | null;
};

type BreakdownData = {
  execution_errors: Array<{ reason: string; count: number }>;
  scene_issues: Array<{ issue: string; count: number }>;
  product_issues: Array<{ issue: string; count: number }>;
  rating_summary: {
    total: number;
    scene_good: number;
    scene_failed: number;
    scene_unset: number;
    product_good: number;
    product_failed: number;
    product_unset: number;
  } | null;
};

function buildSliceParams(slice: AnalyticsComparisonSlice, model?: string): URLSearchParams {
  const params = new URLSearchParams({
    from: slice.range.from,
    to: slice.range.to,
    source: slice.source,
  });
  if (model) params.set('model', model);
  return params;
}

function topCount(items: Array<{ issue: string; count: number }> | Array<{ reason: string; count: number }>) {
  return items[0] ?? null;
}

function renderMetricCell(
  row: StrategyRow | null | undefined,
  breakdown: BreakdownData | null | undefined,
  metric:
    | 'generationCount'
    | 'scene'
    | 'product'
    | 'notRated'
    | 'avgTime'
    | 'sceneIssue'
    | 'productIssue'
    | 'executionError'
) {
  if (!row && metric !== 'sceneIssue' && metric !== 'productIssue' && metric !== 'executionError') {
    return <span className="text-gray-400">-</span>;
  }

  switch (metric) {
    case 'generationCount':
      return <span className="font-medium text-gray-900">{row?.generationCount ?? 0}</span>;
    case 'scene':
      return row && row.sceneRatedCount > 0 ? (
        <div className="space-y-0.5">
          <div className="text-sm">
            <span className="font-medium text-green-600">{row.sceneGoodPct}%</span>
            <span className="text-gray-400"> / </span>
            <span className="font-medium text-orange-600">{row.sceneFailedPct}%</span>
          </div>
          <div className="text-[11px] text-gray-500">{row.sceneRatedCount} rated</div>
        </div>
      ) : (
        <span className="text-gray-400">-</span>
      );
    case 'product':
      return row && row.productRatedCount > 0 ? (
        <div className="space-y-0.5">
          <div className="text-sm">
            <span className="font-medium text-green-600">{row.productGoodPct}%</span>
            <span className="text-gray-400"> / </span>
            <span className="font-medium text-orange-600">{row.productFailedPct}%</span>
          </div>
          <div className="text-[11px] text-gray-500">{row.productRatedCount} rated</div>
        </div>
      ) : (
        <span className="text-gray-400">-</span>
      );
    case 'notRated':
      return row ? (
        <div className="space-y-0.5">
          <div className="font-medium text-gray-900">{row.notRatedCount}</div>
          <div className="text-[11px] text-gray-500">{row.notRatedPct}%</div>
        </div>
      ) : (
        <span className="text-gray-400">-</span>
      );
    case 'avgTime':
      return row?.avgExecTimeMs != null ? (
        <span className="font-medium text-gray-900">{(row.avgExecTimeMs / 1000).toFixed(1)}s</span>
      ) : (
        <span className="text-gray-400">-</span>
      );
    case 'sceneIssue': {
      const item = topCount(breakdown?.scene_issues ?? []);
      return item ? (
        <div className="space-y-0.5">
          <div className="truncate text-sm text-gray-900" title={'issue' in item ? item.issue : item.reason}>
            {'issue' in item ? item.issue : item.reason}
          </div>
          <div className="text-[11px] text-gray-500">{item.count} flagged</div>
        </div>
      ) : (
        <span className="text-gray-400">-</span>
      );
    }
    case 'productIssue': {
      const item = topCount(breakdown?.product_issues ?? []);
      return item ? (
        <div className="space-y-0.5">
          <div className="truncate text-sm text-gray-900" title={'issue' in item ? item.issue : item.reason}>
            {'issue' in item ? item.issue : item.reason}
          </div>
          <div className="text-[11px] text-gray-500">{item.count} flagged</div>
        </div>
      ) : (
        <span className="text-gray-400">-</span>
      );
    }
    case 'executionError': {
      const item = topCount(breakdown?.execution_errors ?? []);
      return item ? (
        <div className="space-y-0.5">
          <div className="truncate text-sm text-gray-900" title={'issue' in item ? item.issue : item.reason}>
            {'issue' in item ? item.issue : item.reason}
          </div>
          <div className="text-[11px] text-gray-500">{item.count} runs</div>
        </div>
      ) : (
        <span className="text-gray-400">-</span>
      );
    }
  }
}

export function StrategyComparisonMatrix({
  slices,
  model,
}: {
  slices: AnalyticsComparisonSlice[];
  model?: string;
}) {
  const [rowsBySlice, setRowsBySlice] = useState<Record<string, StrategyRow | null>>({});
  const [breakdownsBySlice, setBreakdownsBySlice] = useState<Record<string, BreakdownData | null>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (slices.length === 0) {
      setRowsBySlice({});
      setBreakdownsBySlice({});
      return;
    }

    (async () => {
      setLoading(true);
      try {
        const results = await Promise.all(
          slices.map(async (slice) => {
            const params = buildSliceParams(slice, model);
            const perfRes = await fetch(serviceUrl(`analytics/strategy-performance?${params}`), {
              cache: 'no-store',
            });
            const errorsParams = new URLSearchParams(params);
            errorsParams.set('strategy_id', slice.strategyId);
            const errorsRes = await fetch(serviceUrl(`analytics/strategy-errors?${errorsParams}`), {
              cache: 'no-store',
            });

            const perfJson = perfRes.ok ? await perfRes.json() : {};
            const errorsJson = errorsRes.ok ? await errorsRes.json() : {};
            const perfRows = Array.isArray(perfJson.data?.rows) ? perfJson.data.rows : [];
            const row =
              (perfRows.find(
                (entry: Record<string, unknown>) => String(entry.id ?? '') === slice.strategyId,
              ) as StrategyRow | undefined) ?? null;

            return {
              key: slice.key,
              row,
              breakdown: (errorsJson.data ?? null) as BreakdownData | null,
            };
          }),
        );

        if (cancelled) return;

        setRowsBySlice(
          Object.fromEntries(results.map((result) => [result.key, result.row])),
        );
        setBreakdownsBySlice(
          Object.fromEntries(results.map((result) => [result.key, result.breakdown])),
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [model, slices]);

  const metrics = useMemo(
    () => [
      { key: 'generationCount', label: 'Generations' },
      { key: 'scene', label: 'Scene accuracy' },
      { key: 'product', label: 'Product accuracy' },
      { key: 'notRated', label: 'Unrated' },
      { key: 'avgTime', label: 'Avg execution time' },
      { key: 'sceneIssue', label: 'Top scene issue' },
      { key: 'productIssue', label: 'Top product issue' },
      { key: 'executionError', label: 'Top execution error' },
    ] as const,
    [],
  );

  if (slices.length === 0) {
    return (
      <div className="mt-8 rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
        <h2 className="text-lg font-semibold text-gray-900">Strategy comparison</h2>
        <p className="mt-2 text-sm text-gray-600">
          Add at least one date range, one strategy, and one source to generate comparison columns.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Strategy comparison</h2>
          <p className="mt-1 text-sm text-gray-600">
            Horizontally compare strategy metrics and aligned error breakdowns across date ranges and run sources.
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
          {slices.length} columns
        </span>
      </div>

      {loading && <p className="mt-4 text-sm text-gray-500">Loading comparison data…</p>}

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-0">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 min-w-56 border-b border-gray-200 bg-white px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                Metric
              </th>
              {slices.map((slice) => (
                <th
                  key={slice.key}
                  className="min-w-56 border-b border-l border-gray-200 bg-gray-50 px-4 py-3 text-left align-top"
                >
                  <div className="text-sm font-semibold text-gray-900">
                    <Link href={`/strategies/${slice.strategyId}`} className="hover:text-primary-600">
                      {slice.strategyName}
                    </Link>
                  </div>
                  <div className="mt-1 text-xs text-gray-500">{slice.label}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {metrics.map((metric) => (
              <tr key={metric.key}>
                <th className="sticky left-0 z-10 border-b border-gray-100 bg-white px-4 py-3 text-left text-sm font-medium text-gray-700">
                  {metric.label}
                </th>
                {slices.map((slice) => (
                  <td
                    key={`${slice.key}-${metric.key}`}
                    className="border-b border-l border-gray-100 px-4 py-3 align-top text-sm"
                  >
                    {renderMetricCell(
                      rowsBySlice[slice.key],
                      breakdownsBySlice[slice.key],
                      metric.key,
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
