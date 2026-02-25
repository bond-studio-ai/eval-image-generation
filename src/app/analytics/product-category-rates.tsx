'use client';

import { useCallback, useEffect, useState } from 'react';

type CategoryRate = {
  name: string;
  total: number;
  success: number;
  failure: number;
  successPct: number;
  failurePct: number;
};

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

export function ProductCategoryRates({
  from,
  to,
  model,
  strategyId,
  compact,
}: {
  from?: string;
  to?: string;
  model?: string;
  strategyId?: string;
  compact?: boolean;
}) {
  type ProdSortKey = 'name' | 'total' | 'successPct' | 'failurePct';
  type ProdSortDir = 'asc' | 'desc';

  const [categories, setCategories] = useState<CategoryRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<ProdSortKey>('total');
  const [sortDir, setSortDir] = useState<ProdSortDir>('desc');

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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (from) params.set('from', from);
        if (to) params.set('to', to);
        if (model) params.set('model', model);
        if (strategyId) params.set('strategy_id', strategyId);
        const res = await fetch(`/api/v1/analytics/product-category-rates?${params}`, { cache: 'no-store' });
        if (!res.ok || cancelled) return;
        const json = await res.json();
        if (!cancelled) setCategories(json.data?.categories ?? []);
      } catch { /* ignore */ }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [from, to, model, strategyId]);

  if (loading) {
    return <p className="text-sm text-gray-500">Loading product rates…</p>;
  }

  if (categories.length === 0) {
    return <p className="text-sm text-gray-500">No product evaluation data available.</p>;
  }

  if (compact) {
    return (
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Product category rates</p>
        <div className="space-y-1.5">
          {categories.map((cat) => (
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
          {sorted.map((cat) => (
            <tr key={cat.name} className="hover:bg-gray-50/50">
              <td className="py-2 pr-4 text-sm font-medium text-gray-900">
                {formatCategoryName(cat.name)}
              </td>
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
          ))}
        </tbody>
      </table>
    </div>
  );
}
