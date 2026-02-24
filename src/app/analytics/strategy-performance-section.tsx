'use client';

import Link from 'next/link';
import { Fragment, useCallback, useEffect, useState } from 'react';

type StrategyRow = {
  id: string;
  name: string;
  generationCount: number;
  goodPct: number;
  badPct: number;
  notRatedPct: number;
  avgExecTimeMs: number | null;
};

type ErrorBreakdownItem = { reason: string; count: number };

export function StrategyPerformanceSection() {
  const [rows, setRows] = useState<StrategyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [breakdown, setBreakdown] = useState<ErrorBreakdownItem[]>([]);
  const [breakdownLoading, setBreakdownLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/v1/analytics/strategy-performance', { cache: 'no-store' });
        if (!res.ok || cancelled) return;
        const json = await res.json();
        if (json.data && !cancelled) setRows(json.data);
      } catch { /* ignore */ }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  const fetchBreakdown = useCallback(async (strategyId: string) => {
    setBreakdownLoading(true);
    try {
      const res = await fetch(`/api/v1/analytics/strategy-errors?strategy_id=${encodeURIComponent(strategyId)}`, { cache: 'no-store' });
      if (!res.ok) return;
      const json = await res.json();
      setBreakdown(json.data ?? []);
    } catch { setBreakdown([]); }
    finally { setBreakdownLoading(false); }
  }, []);

  const toggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => {
      if (prev === id) return null;
      setBreakdown([]);
      fetchBreakdown(id);
      return id;
    });
  }, [fetchBreakdown]);

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

  return (
    <div className="mt-8 rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
      <h2 className="text-lg font-semibold text-gray-900">Strategy performance</h2>
      <p className="mt-1 text-sm text-gray-600">
        Generation count, good/bad/not-rated percentages, and average execution time per strategy. Expand a row to see error breakdown by failure reason.
      </p>
      <div className="mt-4 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="py-3 pr-4 text-left text-xs font-medium tracking-wider text-gray-600 uppercase" style={{ width: 40 }} />
              <th className="py-3 pr-6 text-left text-xs font-medium tracking-wider text-gray-600 uppercase">
                Strategy
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium tracking-wider text-gray-600 uppercase">
                Generations
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium tracking-wider text-gray-600 uppercase">
                Good (%)
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium tracking-wider text-gray-600 uppercase">
                Bad (%)
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium tracking-wider text-gray-600 uppercase">
                Not rated (%)
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium tracking-wider text-gray-600 uppercase">
                Avg exec time
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => {
              const isExpanded = expandedId === row.id;
              const showingThisBreakdown = isExpanded && breakdown.length >= 0;
              return (
                <Fragment key={row.id}>
                  <tr
                    key={row.id}
                    className="hover:bg-gray-50/50"
                  >
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
                      <Link href={`/strategies/${row.id}`} className="text-primary-600 hover:text-primary-500">
                        {row.name || 'Unnamed'}
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-right text-sm text-gray-700">{row.generationCount}</td>
                    <td className="px-6 py-3 text-right text-sm text-gray-700">{row.goodPct}%</td>
                    <td className="px-6 py-3 text-right text-sm text-gray-700">{row.badPct}%</td>
                    <td className="px-6 py-3 text-right text-sm text-gray-700">{row.notRatedPct}%</td>
                    <td className="px-6 py-3 text-right text-sm text-gray-700">
                      {row.avgExecTimeMs != null ? `${row.avgExecTimeMs} ms` : '—'}
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr key={`${row.id}-breakdown`}>
                      <td colSpan={7} className="bg-gray-50/80 py-3 pl-10 pr-6">
                        {breakdownLoading ? (
                          <p className="text-sm text-gray-500">Loading error breakdown…</p>
                        ) : showingThisBreakdown && breakdown.length === 0 ? (
                          <p className="text-sm text-gray-500">No failed step results for this strategy.</p>
                        ) : (
                          <div className="space-y-2">
                            <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Error breakdown (first 200 chars)</p>
                            <ul className="max-h-60 list-inside list-disc space-y-1 overflow-y-auto text-sm text-gray-700">
                              {breakdown.map((item, i) => (
                                <li key={i} className="flex justify-between gap-4">
                                  <span className="min-w-0 truncate" title={item.reason}>{item.reason}</span>
                                  <span className="shrink-0 font-medium">{item.count}</span>
                                </li>
                              ))}
                            </ul>
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
