'use client';

import { ProductCategoryRates } from '@/app/analytics/product-category-rates';
import { StrategyHoverCard } from '@/components/strategy-hover-card';
import Link from 'next/link';
import { Fragment, useCallback, useEffect, useState } from 'react';

type StrategyRow = {
  id: string;
  name: string;
  model: string;
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

type IssueItem = { issue: string; count: number };
type ErrorItem = { reason: string; count: number };

type BreakdownData = {
  execution_errors: ErrorItem[];
  scene_issues: IssueItem[];
  product_issues: IssueItem[];
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

function RatingSummaryBar({ good, failed, unset, label }: { good: number; failed: number; unset: number; label: string }) {
  const rated = good + failed;
  if (rated === 0 && unset === 0) return null;
  const pct = (n: number) => rated > 0 ? Math.round((n / rated) * 100) : 0;
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-gray-600">{label}</p>
      {rated > 0 ? (
        <div className="flex h-5 w-full overflow-hidden rounded-full bg-gray-100">
          {good > 0 && (
            <div
              className="flex items-center justify-center bg-green-500 text-[10px] font-medium text-white"
              style={{ width: `${pct(good)}%` }}
              title={`Good: ${good}`}
            >
              {pct(good) >= 12 ? `${pct(good)}%` : ''}
            </div>
          )}
          {failed > 0 && (
            <div
              className="flex items-center justify-center bg-orange-500 text-[10px] font-medium text-white"
              style={{ width: `${pct(failed)}%` }}
              title={`Failed: ${failed}`}
            >
              {pct(failed) >= 12 ? `${pct(failed)}%` : ''}
            </div>
          )}
        </div>
      ) : (
        <div className="flex h-5 w-full items-center rounded-full bg-gray-100 px-3">
          <span className="text-[10px] text-gray-400">No rated generations</span>
        </div>
      )}
      <div className="flex gap-3 text-[10px] text-gray-500">
        <span><span className="inline-block h-2 w-2 rounded-full bg-green-500" /> Good {good}</span>
        <span><span className="inline-block h-2 w-2 rounded-full bg-orange-500" /> Failed {failed}</span>
        {unset > 0 && <span className="text-gray-400">({unset} unrated)</span>}
      </div>
    </div>
  );
}

function IssueList({ title, items, total, colorClass }: { title: string; items: IssueItem[]; total: number; colorClass: string }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-gray-500">{title}</p>
      <ul className="space-y-1">
        {items.map((item) => {
          const pctVal = total > 0 ? Math.round((item.count / total) * 100) : 0;
          return (
            <li key={item.issue} className="flex items-center justify-between gap-3 text-sm">
              <span className="min-w-0 truncate text-gray-700" title={item.issue}>{item.issue}</span>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${colorClass}`}>
                {pctVal}%
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function StrategyPerformanceSection({
  from,
  to,
  model,
}: {
  from?: string;
  to?: string;
  model?: string;
}) {
  const [rows, setRows] = useState<StrategyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [breakdowns, setBreakdowns] = useState<Record<string, BreakdownData | null>>({});
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (from) params.set('from', from);
        if (to) params.set('to', to);
        if (model) params.set('model', model);
        const res = await fetch(`/api/v1/analytics/strategy-performance?${params}`, { cache: 'no-store' });
        if (!res.ok || cancelled) return;
        const json = await res.json();
        if (json.data && !cancelled) setRows(json.data.rows ?? json.data);
      } catch { /* ignore */ }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [from, to, model]);

  const fetchBreakdown = useCallback(async (strategyId: string) => {
    setLoadingIds((prev) => new Set(prev).add(strategyId));
    try {
      const res = await fetch(`/api/v1/analytics/strategy-errors?strategy_id=${encodeURIComponent(strategyId)}`, { cache: 'no-store' });
      if (!res.ok) return;
      const json = await res.json();
      setBreakdowns((prev) => ({ ...prev, [strategyId]: json.data ?? null }));
    } catch {
      setBreakdowns((prev) => ({ ...prev, [strategyId]: null }));
    } finally {
      setLoadingIds((prev) => { const next = new Set(prev); next.delete(strategyId); return next; });
    }
  }, []);

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        if (!breakdowns[id]) fetchBreakdown(id);
      }
      return next;
    });
  }, [fetchBreakdown, breakdowns]);

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

  const COL_SPAN = 8;

  return (
    <div className="mt-8 rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
      <h2 className="text-lg font-semibold text-gray-900">Strategy performance</h2>
      <p className="mt-1 text-sm text-gray-600">
        Scene and product accuracy percentages per strategy. Expand a row to see evaluation issue breakdown, failure reasons, and product category rates.
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="py-3 pr-4 text-left text-xs font-medium tracking-wider text-gray-600 uppercase" style={{ width: 40 }} />
              <th className="py-3 pr-6 text-left text-xs font-medium tracking-wider text-gray-600 uppercase">
                Strategy
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium tracking-wider text-gray-600 uppercase">
                Gens
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium tracking-wider text-gray-600 uppercase">
                Scene
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium tracking-wider text-gray-600 uppercase">
                Product
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium tracking-wider text-gray-600 uppercase">
                Unrated
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium tracking-wider text-gray-600 uppercase">
                Avg time
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => {
              const isExpanded = expandedIds.has(row.id);
              const rowBreakdown = breakdowns[row.id];
              const isLoadingBreakdown = loadingIds.has(row.id);
              return (
                <Fragment key={row.id}>
                  <tr className="hover:bg-gray-50/50">
                    <td className="py-2 pr-2">
                      <button
                        type="button"
                        onClick={() => toggleExpand(row.id)}
                        className="rounded p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
                        aria-expanded={isExpanded}
                      >
                        <svg
                          className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                      </button>
                    </td>
                    <td className="py-3 pr-6 text-sm font-medium text-gray-900">
                      <StrategyHoverCard strategyId={row.id}>
                        <Link href={`/strategies/${row.id}`} className="text-primary-600 hover:text-primary-500">
                          {row.name || 'Unnamed'}
                        </Link>
                      </StrategyHoverCard>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-700">{row.generationCount}</td>
                    <td className="px-4 py-3 text-right text-sm">
                      {row.sceneRatedCount > 0 ? (
                        <>
                          <span className="text-green-600">{row.sceneGoodPct}%</span>
                          <span className="text-gray-400"> / </span>
                          <span className="text-orange-600">{row.sceneFailedPct}%</span>
                          <span className="block text-[10px] text-gray-400">{row.sceneRatedCount} rated</span>
                        </>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      {row.productRatedCount > 0 ? (
                        <>
                          <span className="text-green-600">{row.productGoodPct}%</span>
                          <span className="text-gray-400"> / </span>
                          <span className="text-orange-600">{row.productFailedPct}%</span>
                          <span className="block text-[10px] text-gray-400">{row.productRatedCount} rated</span>
                        </>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-500">
                      {row.notRatedCount > 0 ? (
                        <>
                          {row.notRatedCount}
                          <span className="text-[10px] text-gray-400"> ({row.notRatedPct}%)</span>
                        </>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-700">
                      {row.avgExecTimeMs != null ? `${(row.avgExecTimeMs / 1000).toFixed(1)}s` : '—'}
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr key={`${row.id}-breakdown`}>
                      <td colSpan={COL_SPAN} className="bg-gray-50/80 py-6 pl-10 pr-6 border-b-2 border-gray-200">
                        {isLoadingBreakdown ? (
                          <p className="text-sm text-gray-500">Loading breakdown…</p>
                        ) : !rowBreakdown ? (
                          <p className="text-sm text-gray-500">No data available.</p>
                        ) : (
                          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                            {/* Rating summary bars */}
                            {rowBreakdown.rating_summary && (
                              <div className="space-y-3 lg:col-span-2">
                                <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Rating distribution</p>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                  <RatingSummaryBar
                                    label="Scene accuracy"
                                    good={rowBreakdown.rating_summary.scene_good}
                                    failed={rowBreakdown.rating_summary.scene_failed}
                                    unset={rowBreakdown.rating_summary.scene_unset}
                                  />
                                  <RatingSummaryBar
                                    label="Product accuracy"
                                    good={rowBreakdown.rating_summary.product_good}
                                    failed={rowBreakdown.rating_summary.product_failed}
                                    unset={rowBreakdown.rating_summary.product_unset}
                                  />
                                </div>
                              </div>
                            )}

                            {/* Per-strategy product category rates */}
                            <div className="lg:col-span-2">
                              <ProductCategoryRates
                                strategyId={row.id}
                                from={from}
                                to={to}
                                model={model}
                                compact
                              />
                            </div>

                            {/* Scene evaluation issues */}
                            <IssueList
                              title="Scene accuracy issues"
                              items={rowBreakdown.scene_issues}
                              total={(rowBreakdown.rating_summary?.scene_good ?? 0) + (rowBreakdown.rating_summary?.scene_failed ?? 0)}
                              colorClass="bg-red-100 text-red-700"
                            />

                            {/* Product evaluation issues */}
                            <IssueList
                              title="Product accuracy issues"
                              items={rowBreakdown.product_issues}
                              total={(rowBreakdown.rating_summary?.product_good ?? 0) + (rowBreakdown.rating_summary?.product_failed ?? 0)}
                              colorClass="bg-amber-100 text-amber-700"
                            />

                            {/* Execution errors */}
                            {rowBreakdown.execution_errors.length > 0 && (
                              <div className="lg:col-span-2">
                                <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-gray-500">Execution errors</p>
                                <ul className="max-h-40 space-y-1 overflow-y-auto">
                                  {rowBreakdown.execution_errors.map((item, i) => (
                                    <li key={i} className="flex items-center justify-between gap-3 text-sm">
                                      <span className="min-w-0 truncate text-gray-700" title={item.reason}>{item.reason}</span>
                                      <span className="shrink-0 rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700">
                                        {item.count}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Empty state */}
                            {rowBreakdown.scene_issues.length === 0 &&
                              rowBreakdown.product_issues.length === 0 &&
                              rowBreakdown.execution_errors.length === 0 &&
                              !rowBreakdown.rating_summary && (
                                <p className="text-sm text-gray-500 lg:col-span-2">No evaluation data or errors for this strategy.</p>
                              )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
