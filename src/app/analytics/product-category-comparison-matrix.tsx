'use client';

import { formatComparisonSource, type AnalyticsComparisonSlice } from '@/app/analytics/comparison-utils';
import { serviceUrl } from '@/lib/api-base';
import { useEffect, useMemo, useState } from 'react';

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

function formatCategoryName(name: string): string {
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}

function normalizeCategoryRows(raw: unknown): CategoryRate[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((entry) => {
    const row = entry as Record<string, unknown>;
    return {
      name: typeof row.name === 'string' ? row.name : String(row.name ?? ''),
      total: Number(row.total) || 0,
      success: Number(row.success) || 0,
      failure: Number(row.failure) || 0,
      successPct: Number(row.successPct) || 0,
      failurePct: Number(row.failurePct) || 0,
      issues: Array.isArray(row.issues)
        ? row.issues
            .map((issue) => ({
              issue: String((issue as Record<string, unknown>).issue ?? ''),
              count: Number((issue as Record<string, unknown>).count ?? 0),
            }))
            .filter((issue) => issue.issue)
        : [],
    };
  });
}

function buildSliceParams(slice: AnalyticsComparisonSlice, model?: string): URLSearchParams {
  const params = new URLSearchParams({
    strategy_id: slice.strategyId,
    from: slice.range.from,
    to: slice.range.to,
    source: slice.source,
  });
  if (model) params.set('model', model);
  return params;
}

function renderCategorySummaryCell(category: CategoryRate | undefined) {
  if (!category) return <span className="text-gray-400">-</span>;
  return (
    <div className="space-y-2">
      <div className="text-sm text-gray-700">{category.total} evaluated</div>
      <div className="space-y-0.5 text-sm">
        <div className="text-green-600">
          {category.success} ({category.successPct}%)
        </div>
        <div className="text-orange-600">
          {category.failure} ({category.failurePct}%)
        </div>
      </div>
      <div className="flex h-2 overflow-hidden rounded-full bg-gray-100">
        {category.success > 0 && (
          <div className="bg-green-500" style={{ width: `${category.successPct}%` }} />
        )}
        {category.failure > 0 && (
          <div className="bg-orange-500" style={{ width: `${category.failurePct}%` }} />
        )}
      </div>
    </div>
  );
}

export function ProductCategoryComparisonMatrix({
  slices,
  model,
}: {
  slices: AnalyticsComparisonSlice[];
  model?: string;
}) {
  const [categoriesBySlice, setCategoriesBySlice] = useState<Record<string, CategoryRate[]>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (slices.length === 0) {
      setCategoriesBySlice({});
      return;
    }

    (async () => {
      setLoading(true);
      try {
        const results = await Promise.all(
          slices.map(async (slice) => {
            const params = buildSliceParams(slice, model);
            const response = await fetch(serviceUrl(`analytics/product-category-rates?${params}`), {
              cache: 'no-store',
            });
            const json = response.ok ? await response.json() : {};
            return {
              key: slice.key,
              categories: normalizeCategoryRows(json.data?.categories),
            };
          }),
        );

        if (cancelled) return;
        setCategoriesBySlice(
          Object.fromEntries(results.map((result) => [result.key, result.categories])),
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [model, slices]);

  const categoryRows = useMemo(() => {
    const categoryNames = new Set<string>();
    for (const categories of Object.values(categoriesBySlice)) {
      for (const category of categories) categoryNames.add(category.name);
    }

    return [...categoryNames]
      .sort((left, right) => formatCategoryName(left).localeCompare(formatCategoryName(right)))
      .flatMap((categoryName) => {
        const issueNames = new Set<string>();
        for (const categories of Object.values(categoriesBySlice)) {
          const category = categories.find((entry) => entry.name === categoryName);
          for (const issue of category?.issues ?? []) issueNames.add(issue.issue);
        }

        return [
          { type: 'category' as const, categoryName },
          ...[...issueNames]
            .sort((left, right) => left.localeCompare(right))
            .map((issueName) => ({ type: 'issue' as const, categoryName, issueName })),
        ];
      });
  }, [categoriesBySlice]);

  if (slices.length === 0) {
    return (
      <div className="mt-8 rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
        <h2 className="text-lg font-semibold text-gray-900">Product category comparison</h2>
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
          <h2 className="text-lg font-semibold text-gray-900">Product category comparison</h2>
          <p className="mt-1 text-sm text-gray-600">
            Spreadsheet-style product category comparison across selected ranges, strategies, and run sources.
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
              <th className="sticky left-0 z-10 min-w-64 border-b border-gray-200 bg-white px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                Category / issue
              </th>
              {slices.map((slice) => (
                <th
                  key={slice.key}
                  className="min-w-56 border-b border-l border-gray-200 bg-gray-50 px-4 py-3 text-left align-top"
                >
                  <div className="text-sm font-semibold text-gray-900">{slice.strategyName}</div>
                  <div className="mt-1 text-xs text-gray-500">
                    {formatComparisonSource(slice.source)} | {slice.range.from} to {slice.range.to}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {categoryRows.map((row) => (
              <tr key={row.type === 'category' ? row.categoryName : `${row.categoryName}:${row.issueName}`}>
                <th
                  className={`sticky left-0 z-10 border-b border-gray-100 bg-white px-4 py-3 text-left ${
                    row.type === 'category'
                      ? 'text-sm font-semibold text-gray-900'
                      : 'pl-8 text-xs font-normal text-gray-600'
                  }`}
                >
                  {row.type === 'category' ? formatCategoryName(row.categoryName) : row.issueName}
                </th>
                {slices.map((slice) => {
                  const category = (categoriesBySlice[slice.key] ?? []).find(
                    (entry) => entry.name === row.categoryName,
                  );
                  const issue =
                    row.type === 'issue'
                      ? category?.issues.find((entry) => entry.issue === row.issueName)
                      : undefined;

                  return (
                    <td
                      key={`${slice.key}-${row.categoryName}-${row.type}`}
                      className="border-b border-l border-gray-100 px-4 py-3 align-top"
                    >
                      {row.type === 'category' ? (
                        renderCategorySummaryCell(category)
                      ) : issue && category && category.failure > 0 ? (
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-orange-600">
                            {issue.count} ({Math.round((issue.count / category.failure) * 100)}%)
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-orange-100">
                            <div
                              className="h-full bg-orange-500"
                              style={{
                                width: `${Math.min(100, (issue.count / category.failure) * 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
