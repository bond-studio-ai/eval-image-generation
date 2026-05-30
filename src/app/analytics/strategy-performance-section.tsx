'use client';

import { browserTimezone, serviceUrl } from '@/lib/api-base';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { StrategyTableHeader } from './_strategy-performance/strategy-table-header';
import { StrategyTableRow } from './_strategy-performance/strategy-table-row';
import type { BreakdownData, SortDir, SortKey, StrategyRow } from './_strategy-performance/types';

export function StrategyPerformanceSection({
  from,
  to,
  model,
  source,
}: {
  from?: string;
  to?: string;
  model?: string;
  source?: string;
}) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [breakdowns, setBreakdowns] = useState<Record<string, BreakdownData | null>>({});
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>('generationCount');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const { data: rows = [], isLoading: loading } = useQuery({
    queryKey: ['strategy-performance', from, to, model, source],
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      if (model) params.set('model', model);
      if (source && source !== 'all') params.set('source', source);
      const tz = browserTimezone();
      if (tz) params.set('tz', tz);
      const res = await fetch(serviceUrl(`analytics/strategy-performance?${params}`), {
        cache: 'no-store',
        signal,
      });
      if (!res.ok) throw new Error('Failed to load strategy performance');
      const json = await res.json();
      return (json.data ? (json.data.rows ?? json.data) : []) as StrategyRow[];
    },
  });

  const fetchBreakdown = useCallback(
    async (strategyId: string) => {
      setLoadingIds((prev) => new Set(prev).add(strategyId));
      try {
        const params = new URLSearchParams({ strategy_id: strategyId });
        if (from) params.set('from', from);
        if (to) params.set('to', to);
        if (model) params.set('model', model);
        if (source && source !== 'all') params.set('source', source);
        const tz = browserTimezone();
        if (tz) params.set('tz', tz);
        const res = await fetch(serviceUrl(`analytics/strategy-errors?${params}`), {
          cache: 'no-store',
        });
        if (!res.ok) return;
        const json = await res.json();
        const raw = json.data;
        if (!raw) {
          setBreakdowns((prev) => ({ ...prev, [strategyId]: null }));
          return;
        }
        const executionErrors = raw.executionErrors ?? raw.execution_errors;
        const sceneIssues = raw.sceneIssues ?? raw.scene_issues;
        const productIssues = raw.productIssues ?? raw.product_issues;
        const ratingSummary = raw.ratingSummary ?? raw.rating_summary;
        const normalized: BreakdownData = {
          execution_errors: Array.isArray(executionErrors) ? executionErrors : [],
          scene_issues: Array.isArray(sceneIssues) ? sceneIssues : [],
          product_issues: Array.isArray(productIssues) ? productIssues : [],
          rating_summary: ratingSummary
            ? {
                total: ratingSummary.total ?? 0,
                scene_good: ratingSummary.sceneGood ?? ratingSummary.scene_good ?? 0,
                scene_failed: ratingSummary.sceneFailed ?? ratingSummary.scene_failed ?? 0,
                scene_unset: ratingSummary.sceneUnset ?? ratingSummary.scene_unset ?? 0,
                product_good: ratingSummary.productGood ?? ratingSummary.product_good ?? 0,
                product_failed: ratingSummary.productFailed ?? ratingSummary.product_failed ?? 0,
                product_unset: ratingSummary.productUnset ?? ratingSummary.product_unset ?? 0,
              }
            : null,
        };
        setBreakdowns((prev) => ({ ...prev, [strategyId]: normalized }));
      } catch {
        setBreakdowns((prev) => ({ ...prev, [strategyId]: null }));
      } finally {
        setLoadingIds((prev) => {
          const next = new Set(prev);
          next.delete(strategyId);
          return next;
        });
      }
    },
    [from, model, source, to],
  );

  const toggleExpand = useCallback(
    (id: string) => {
      setExpandedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
      if (!breakdowns[id]) fetchBreakdown(id);
    },
    [fetchBreakdown, breakdowns],
  );

  const toggleSort = useCallback((key: SortKey) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        return key;
      }
      setSortDir(key === 'name' ? 'asc' : 'desc');
      return key;
    });
  }, []);

  const sortedRows = rows.toSorted((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1;
    if (sortKey === 'name') return dir * a.name.localeCompare(b.name);
    const av = a[sortKey] ?? -1;
    const bv = b[sortKey] ?? -1;
    return dir * ((av as number) - (bv as number));
  });

  if (loading) {
    return (
      <div className="mt-8 rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
        <h2 className="text-lg font-semibold text-gray-900">Strategy performance</h2>
        <p className="mt-4 text-sm text-gray-500">Loading…</p>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="mt-8 rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
        <h2 className="text-lg font-semibold text-gray-900">Strategy performance</h2>
        <p className="mt-4 text-sm text-gray-600">No strategies or runs yet.</p>
      </div>
    );
  }

  const COL_SPAN = 7;

  return (
    <div className="mt-8 rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
      <h2 className="text-lg font-semibold text-gray-900">Strategy performance</h2>
      <p className="mt-1 text-sm text-gray-600">
        Scene and product accuracy percentages per strategy. Expand a row to see evaluation issue
        breakdown, failure reasons, and product category rates.
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <StrategyTableHeader sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
          <tbody className="divide-y divide-gray-100">
            {sortedRows.map((row) => (
              <StrategyTableRow
                key={row.id}
                row={row}
                isExpanded={expandedIds.has(row.id)}
                breakdown={breakdowns[row.id]}
                isLoadingBreakdown={loadingIds.has(row.id)}
                colSpan={COL_SPAN}
                onToggleExpand={toggleExpand}
                from={from}
                to={to}
                model={model}
                source={source}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
