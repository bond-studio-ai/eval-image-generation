'use client';

import { serviceUrl } from '@/lib/api-base';
import { Fragment, useCallback, useEffect, useState } from 'react';

type CategoryIssueCount = { issue: string; count: number };

type CategoryRate = {
  name: string;
  total: number;
  success: number;
  failure: number;
  successPct: number;
  failurePct: number;
  issues: CategoryIssueCount[];
};

function normalizeIssueItems(raw: unknown): CategoryIssueCount[] {
  if (!Array.isArray(raw)) return [];
  const out: CategoryIssueCount[] = [];
  for (const x of raw) {
    if (!x || typeof x !== 'object') continue;
    const o = x as Record<string, unknown>;
    if (typeof o.issue !== 'string' || typeof o.count !== 'number') continue;
    if (!Number.isFinite(o.count)) continue;
    out.push({ issue: o.issue, count: o.count });
  }
  return out;
}

function normalizeCategoryRows(raw: unknown): CategoryRate[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((c) => {
    const row = c as Record<string, unknown>;
    return {
      name: typeof row.name === 'string' ? row.name : String(row.name ?? ''),
      total: Number(row.total) || 0,
      success: Number(row.success) || 0,
      failure: Number(row.failure) || 0,
      successPct: Number(row.successPct) || 0,
      failurePct: Number(row.failurePct) || 0,
      issues: normalizeIssueItems(row.issues),
    };
  });
}

function formatCategoryName(name: string): string {
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function ProdSortIcon({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) {
  return (
    <svg className={`ml-1 inline h-3 w-3 ${active ? 'text-gray-700' : 'text-gray-300'}`} viewBox="0 0 10 14" fill="currentColor">
      {dir === 'asc' || !active ? (
        <path d="M5 0L10 6H0L5 0Z" opacity={active && dir === 'asc' ? 1 : 0.3} />
      ) : null}
      {dir === 'desc' || !active ? (
        <path d="M5 14L0 8H10L5 14Z" opacity={active && dir === 'desc' ? 1 : 0.3} />
      ) : null}
    </svg>
  );
}

function CategoryIssueBreakdown({
  items,
  totalEvaluated,
}: {
  items: CategoryIssueCount[];
  totalEvaluated: number;
}) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        No flagged product accuracy issues in this category for the selected filters.
      </p>
    );
  }
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-gray-500">Flagged issues</p>
      <ul className="space-y-1">
        {items.map((item) => {
          const pctVal = totalEvaluated > 0 ? Math.round((item.count / totalEvaluated) * 100) : 0;
          return (
            <li key={item.issue} className="flex items-center justify-between gap-3 text-sm">
              <span className="min-w-0 truncate text-gray-700" title={item.issue}>
                {item.issue}
              </span>
              <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                {item.count}
                <span className="text-amber-600"> ({pctVal}%)</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const COL_SPAN = 6;

export function ProductCategoryRates({
  from,
  to,
  model,
  source,
  strategyId,
  compact,
}: {
  from?: string;
  to?: string;
  model?: string;
  source?: string;
  strategyId?: string;
  compact?: boolean;
}) {
  type ProdSortKey = 'name' | 'total' | 'successPct' | 'failurePct';
  type ProdSortDir = 'asc' | 'desc';

  const [categories, setCategories] = useState<CategoryRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<ProdSortKey>('total');
  const [sortDir, setSortDir] = useState<ProdSortDir>('desc');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleSort = useCallback((key: ProdSortKey) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        return key;
      }
      setSortDir(key === 'name' ? 'asc' : 'desc');
      return key;
    });
  }, []);

  const toggleExpand = useCallback((categoryKey: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(categoryKey)) next.delete(categoryKey);
      else next.add(categoryKey);
      return next;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (from) params.set('from', from);
        if (to) params.set('to', to);
        if (model) params.set('model', model);
        if (source && source !== 'all') params.set('source', source);
        if (strategyId) params.set('strategy_id', strategyId);
        const res = await fetch(serviceUrl(`analytics/product-category-rates?${params}`), { cache: 'no-store' });
        if (!res.ok || cancelled) return;
        const json = await res.json();
        if (!cancelled) {
          setCategories(normalizeCategoryRows(json.data?.categories));
          setExpandedIds(new Set());
        }
      } catch { /* ignore */ }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [from, to, model, source, strategyId]);

  if (loading) {
    return <p className="text-sm text-gray-500">Loading product rates…</p>;
  }

  if (categories.length === 0) {
    return <p className="text-sm text-gray-500">No product evaluation data available.</p>;
  }

  const sortedCompact = [...categories].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1;
    if (sortKey === 'name') return dir * formatCategoryName(a.name).localeCompare(formatCategoryName(b.name));
    return dir * ((a[sortKey] as number) - (b[sortKey] as number));
  });

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Product category rates</p>
          <div className="flex gap-1">
            {([
              { key: 'name' as ProdSortKey, label: 'Name' },
              { key: 'total' as ProdSortKey, label: 'Count' },
              { key: 'successPct' as ProdSortKey, label: 'Success' },
              { key: 'failurePct' as ProdSortKey, label: 'Failure' },
            ]).map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => toggleSort(key)}
                className={`rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                  sortKey === key
                    ? 'bg-gray-200 text-gray-800'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {label}
                <ProdSortIcon active={sortKey === key} dir={sortDir} />
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          {sortedCompact.map((cat) => (
            <div key={cat.name} className="flex items-center gap-2">
              <span className="w-28 truncate text-xs text-gray-700" title={formatCategoryName(cat.name)}>
                {formatCategoryName(cat.name)}
              </span>
              <div className="flex h-4 flex-1 overflow-hidden rounded-full bg-gray-100">
                {cat.success > 0 && (
                  <div
                    className="flex items-center justify-center bg-green-500 text-[9px] font-medium text-white"
                    style={{ width: `${cat.successPct}%` }}
                    title={`Success: ${cat.success}`}
                  >
                    {cat.successPct >= 15 ? `${cat.successPct}%` : ''}
                  </div>
                )}
                {cat.failure > 0 && (
                  <div
                    className="flex items-center justify-center bg-orange-500 text-[9px] font-medium text-white"
                    style={{ width: `${cat.failurePct}%` }}
                    title={`Failure: ${cat.failure}`}
                  >
                    {cat.failurePct >= 15 ? `${cat.failurePct}%` : ''}
                  </div>
                )}
              </div>
              <span className="w-8 text-right text-[10px] text-gray-500">{cat.total}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const sorted = [...categories].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1;
    if (sortKey === 'name') return dir * formatCategoryName(a.name).localeCompare(formatCategoryName(b.name));
    return dir * ((a[sortKey] as number) - (b[sortKey] as number));
  });

  const thBase = 'px-4 py-2 text-right text-xs font-medium uppercase tracking-wider text-gray-600 cursor-pointer select-none hover:text-gray-900 transition-colors';

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead>
          <tr>
            <th className="w-10 py-2 pr-0" aria-hidden />
            <th className="py-2 pr-4 text-left text-xs font-medium uppercase tracking-wider text-gray-600 cursor-pointer select-none hover:text-gray-900 transition-colors" onClick={() => toggleSort('name')}>
              Product Category<ProdSortIcon active={sortKey === 'name'} dir={sortDir} />
            </th>
            <th className={thBase} onClick={() => toggleSort('total')}>
              Evaluated<ProdSortIcon active={sortKey === 'total'} dir={sortDir} />
            </th>
            <th className={thBase} onClick={() => toggleSort('successPct')}>
              Success<ProdSortIcon active={sortKey === 'successPct'} dir={sortDir} />
            </th>
            <th className={thBase} onClick={() => toggleSort('failurePct')}>
              Failure<ProdSortIcon active={sortKey === 'failurePct'} dir={sortDir} />
            </th>
            <th className="w-60 px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-600">
              Rate
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {sorted.map((cat) => {
            const isExpanded = expandedIds.has(cat.name);
            return (
              <Fragment key={cat.name}>
                <tr className="hover:bg-gray-50/50">
                  <td className="py-2 pr-0">
                    <button
                      type="button"
                      onClick={() => toggleExpand(cat.name)}
                      className="rounded p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
                      aria-expanded={isExpanded}
                      aria-label={isExpanded ? 'Collapse issues' : 'Expand issues'}
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
                  <td className="py-2 pr-4 text-sm font-medium text-gray-900">{formatCategoryName(cat.name)}</td>
                  <td className="px-4 py-2 text-right text-sm text-gray-700">{cat.total}</td>
                  <td className="px-4 py-2 text-right text-sm text-green-600">
                    {cat.success} ({cat.successPct}%)
                  </td>
                  <td className="px-4 py-2 text-right text-sm text-orange-600">
                    {cat.failure} ({cat.failurePct}%)
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex h-5 w-full overflow-hidden rounded-full bg-gray-100">
                      {cat.success > 0 && (
                        <div
                          className="flex items-center justify-center bg-green-500 text-[10px] font-medium text-white"
                          style={{ width: `${cat.successPct}%` }}
                        >
                          {cat.successPct >= 12 ? `${cat.successPct}%` : ''}
                        </div>
                      )}
                      {cat.failure > 0 && (
                        <div
                          className="flex items-center justify-center bg-orange-500 text-[10px] font-medium text-white"
                          style={{ width: `${cat.failurePct}%` }}
                        >
                          {cat.failurePct >= 12 ? `${cat.failurePct}%` : ''}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
                {isExpanded && (
                  <tr>
                    <td
                      colSpan={COL_SPAN}
                      className="border-b-2 border-gray-200 bg-gray-50/80 py-4 pl-10 pr-6"
                    >
                      <CategoryIssueBreakdown items={cat.issues} totalEvaluated={cat.total} />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
