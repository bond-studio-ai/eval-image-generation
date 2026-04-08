'use client';

import {
  formatComparisonRange,
  formatComparisonSource,
  type AnalyticsComparisonSlice,
} from '@/app/analytics/comparison-utils';
import { serviceUrl } from '@/lib/api-base';
import { Fragment, useEffect, useMemo, useState } from 'react';

type SummaryData = {
  sceneRatedCount: number;
  sceneGoodPct: number;
  sceneFailedPct: number;
  productRatedCount: number;
  productGoodPct: number;
  productFailedPct: number;
};

type IssueItem = { issue: string; count: number };

type CategoryRate = {
  name: string;
  total: number;
  success: number;
  failure: number;
  successPct: number;
  failurePct: number;
  issues: IssueItem[];
};

type SliceData = {
  summary: SummaryData | null;
  sceneIssues: IssueItem[];
  categories: CategoryRate[];
};

function formatCategoryName(name: string): string {
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
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
            .filter((i) => i.issue)
        : [],
    };
  });
}

function normalizeIssueItems(raw: unknown): IssueItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => {
      const row = entry as Record<string, unknown>;
      return {
        issue: String(row.issue ?? ''),
        count: Number(row.count ?? 0),
      };
    })
    .filter((i) => i.issue);
}

function normalizeSummary(raw: unknown): SummaryData | null {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as Record<string, unknown>;
  return {
    sceneRatedCount: Number(s.sceneRatedCount) || 0,
    sceneGoodPct: Number(s.sceneGoodPct) || 0,
    sceneFailedPct: Number(s.sceneFailedPct) || 0,
    productRatedCount: Number(s.productRatedCount) || 0,
    productGoodPct: Number(s.productGoodPct) || 0,
    productFailedPct: Number(s.productFailedPct) || 0,
  };
}

const SLICE_BG_COLORS = [
  { header: 'bg-amber-50', headerBorder: 'border-amber-200' },
  { header: 'bg-blue-50', headerBorder: 'border-blue-200' },
  { header: 'bg-emerald-50', headerBorder: 'border-emerald-200' },
  { header: 'bg-violet-50', headerBorder: 'border-violet-200' },
  { header: 'bg-rose-50', headerBorder: 'border-rose-200' },
  { header: 'bg-cyan-50', headerBorder: 'border-cyan-200' },
];

export function ComparisonSpreadsheet({
  slices,
  model,
}: {
  slices: AnalyticsComparisonSlice[];
  model?: string;
}) {
  const [dataBySlice, setDataBySlice] = useState<Record<string, SliceData>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (slices.length === 0) {
      setDataBySlice({});
      return;
    }

    (async () => {
      setLoading(true);
      try {
        const results = await Promise.all(
          slices.map(async (slice) => {
            const catParams = new URLSearchParams({
              from: slice.range.from,
              to: slice.range.to,
              source: slice.source,
              strategy_id: slice.strategyId,
            });
            if (model) catParams.set('model', model);

            const catRes = await fetch(
              serviceUrl(`analytics/product-category-rates?${catParams}`),
              { cache: 'no-store' },
            );

            const catJson = catRes.ok ? await catRes.json() : {};

            return {
              key: slice.key,
              data: {
                summary: normalizeSummary(catJson.data?.summary),
                sceneIssues: normalizeIssueItems(catJson.data?.sceneIssues),
                categories: normalizeCategoryRows(catJson.data?.categories),
              },
            };
          }),
        );

        if (cancelled) return;
        setDataBySlice(
          Object.fromEntries(results.map((r) => [r.key, r.data])),
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [model, slices]);

  const sceneIssueRows = useMemo(() => {
    const issueNames = new Set<string>();
    for (const data of Object.values(dataBySlice)) {
      for (const item of data.sceneIssues) issueNames.add(item.issue);
    }
    return [...issueNames].sort((a, b) => a.localeCompare(b));
  }, [dataBySlice]);

  const categoryRows = useMemo(() => {
    const names = new Set<string>();
    for (const data of Object.values(dataBySlice)) {
      for (const cat of data.categories) names.add(cat.name);
    }

    return [...names]
      .sort((a, b) => formatCategoryName(a).localeCompare(formatCategoryName(b)))
      .flatMap((catName) => {
        const issueNames = new Set<string>();
        for (const data of Object.values(dataBySlice)) {
          const cat = data.categories.find((c) => c.name === catName);
          for (const issue of cat?.issues ?? []) issueNames.add(issue.issue);
        }
        return [
          { type: 'category' as const, categoryName: catName },
          ...[...issueNames]
            .sort((a, b) => a.localeCompare(b))
            .map((issueName) => ({
              type: 'issue' as const,
              categoryName: catName,
              issueName,
            })),
        ];
      });
  }, [dataBySlice]);

  if (slices.length === 0) {
    return (
      <div className="mt-8 rounded-lg border border-gray-200 bg-white p-8 text-center shadow-xs">
        <p className="text-sm text-gray-500">
          Add comparison columns above to generate the spreadsheet.
        </p>
      </div>
    );
  }

  const colCount = slices.length;
  const fullColSpan = 1 + colCount * 3;

  return (
    <div className="mt-8 space-y-6">
      {/* ── Scene Accuracy Issues ── */}
      <div className="overflow-x-auto rounded-lg border border-gray-300 bg-white shadow-xs">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th
                colSpan={1 + colCount}
                className="border-b border-gray-300 bg-gray-50 px-4 py-3 text-left text-sm font-bold text-gray-900"
              >
                Scene Accuracy Issues
              </th>
            </tr>
            <tr>
              <th className="w-48 min-w-[180px] border-b border-r border-gray-300 bg-white px-3 py-2" />
              {slices.map((slice, i) => {
                const color = SLICE_BG_COLORS[i % SLICE_BG_COLORS.length];
                const s = dataBySlice[slice.key]?.summary;
                return (
                  <th
                    key={slice.key}
                    className={`border-b border-r border-gray-300 px-3 py-2.5 text-center ${color.header}`}
                    style={{ minWidth: 160 }}
                  >
                    <div className="text-xs font-bold text-gray-900">
                      {slice.strategyName}
                    </div>
                    <div className="mt-0.5 text-[10px] font-medium text-gray-600">
                      {s ? `${s.sceneRatedCount} rated · ${s.sceneGoodPct}% good · ${s.sceneFailedPct}% fail` : ''}
                    </div>
                  </th>
                );
              })}
            </tr>
            <tr className="bg-gray-100">
              <th className="sticky left-0 z-10 border-b border-r border-gray-300 bg-gray-100 px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-600">
                Issue
              </th>
              {slices.map((slice) => (
                <th
                  key={slice.key}
                  className="border-b border-r border-gray-300 px-2 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-gray-500"
                >
                  Count (% of failed)
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={1 + colCount} className="px-4 py-6 text-center text-sm text-gray-400">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && sceneIssueRows.length === 0 && (
              <tr>
                <td colSpan={1 + colCount} className="px-4 py-4 text-center text-sm text-gray-400">
                  No scene accuracy issues found.
                </td>
              </tr>
            )}
            {!loading &&
              sceneIssueRows.map((issueName) => (
                <tr key={issueName} className="bg-white">
                  <th className="sticky left-0 z-10 border-b border-r border-gray-200 bg-white px-3 py-1.5 text-left text-[11px] font-normal text-gray-700">
                    {issueName}
                  </th>
                  {slices.map((slice) => {
                    const d = dataBySlice[slice.key];
                    const item = d?.sceneIssues.find((i) => i.issue === issueName);
                    const sceneFailed = d?.summary
                      ? Math.round((d.summary.sceneFailedPct / 100) * d.summary.sceneRatedCount)
                      : 0;
                    const pct = item && sceneFailed > 0
                      ? Math.round((item.count / sceneFailed) * 100)
                      : 0;
                    return (
                      <td
                        key={slice.key}
                        className="border-b border-r border-gray-200 px-2 py-1.5 text-center text-[11px] text-red-600"
                      >
                        {item ? `${item.count} (${pct}%)` : '-'}
                      </td>
                    );
                  })}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* ── Product Category Rates ── */}
      <div className="overflow-x-auto rounded-lg border border-gray-300 bg-white shadow-xs">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th
                colSpan={fullColSpan}
                className="border-b border-gray-300 bg-gray-50 px-4 py-3 text-left text-sm font-bold text-gray-900"
              >
                Product Category Success / Failure Rates
              </th>
            </tr>

            {/* Slice group headers */}
            <tr>
              <th className="w-48 min-w-[180px] border-b border-r border-gray-300 bg-white px-3 py-2" />
              {slices.map((slice, i) => {
                const color = SLICE_BG_COLORS[i % SLICE_BG_COLORS.length];
                const s = dataBySlice[slice.key]?.summary;
                const ratedCount = s?.productRatedCount ?? 0;
                return (
                  <th
                    key={slice.key}
                    colSpan={3}
                    className={`border-b border-r border-gray-300 px-3 py-2.5 text-center ${color.header}`}
                    style={{ minWidth: 320 }}
                  >
                    <div className="text-xs font-bold text-gray-900">
                      {slice.strategyName}
                    </div>
                    <div className="mt-0.5 text-[10px] font-medium text-gray-600">
                      {formatComparisonSource(slice.source)} ({formatComparisonRange(slice.range)})
                    </div>
                    <div className="mt-0.5 text-[10px] font-semibold text-gray-700">
                      {ratedCount} Rated Images
                    </div>
                  </th>
                );
              })}
            </tr>

            {/* Overall accuracy rows */}
            <tr className="bg-gray-50/60">
              <th className="border-b border-r border-gray-200 px-3 py-1.5 text-left text-[11px] font-semibold text-gray-700">
                Scene Accuracy (Overall)
              </th>
              {slices.map((slice, i) => {
                const s = dataBySlice[slice.key]?.summary;
                const color = SLICE_BG_COLORS[i % SLICE_BG_COLORS.length];
                return (
                  <Fragment key={slice.key}>
                    <td className={`border-b border-gray-200 px-2 py-1.5 text-center text-[11px] text-gray-500 ${color.header}`}>
                      {s?.sceneRatedCount ?? ''}
                    </td>
                    <td className={`border-b border-gray-200 px-2 py-1.5 text-center text-[11px] font-semibold text-green-700 ${color.header}`}>
                      {s ? `${s.sceneGoodPct}%` : '-'}
                    </td>
                    <td className={`border-b border-r border-gray-200 px-2 py-1.5 text-center text-[11px] font-semibold text-red-600 ${color.header}`}>
                      {s ? `${s.sceneFailedPct}%` : '-'}
                    </td>
                  </Fragment>
                );
              })}
            </tr>
            <tr className="bg-gray-50/60">
              <th className="border-b border-r border-gray-300 px-3 py-1.5 text-left text-[11px] font-semibold text-gray-700">
                Product Accuracy (Overall)
              </th>
              {slices.map((slice, i) => {
                const s = dataBySlice[slice.key]?.summary;
                const color = SLICE_BG_COLORS[i % SLICE_BG_COLORS.length];
                return (
                  <Fragment key={slice.key}>
                    <td className={`border-b border-gray-300 px-2 py-1.5 text-center text-[11px] text-gray-500 ${color.header}`}>
                      {s?.productRatedCount ?? ''}
                    </td>
                    <td className={`border-b border-gray-300 px-2 py-1.5 text-center text-[11px] font-semibold text-green-700 ${color.header}`}>
                      {s ? `${s.productGoodPct}%` : '-'}
                    </td>
                    <td className={`border-b border-r border-gray-300 px-2 py-1.5 text-center text-[11px] font-semibold text-red-600 ${color.header}`}>
                      {s ? `${s.productFailedPct}%` : '-'}
                    </td>
                  </Fragment>
                );
              })}
            </tr>

            {/* Sub-column headers */}
            <tr className="bg-gray-100">
              <th className="sticky left-0 z-10 border-b border-r border-gray-300 bg-gray-100 px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-600">
                Category
              </th>
              {slices.map((slice) => (
                <Fragment key={slice.key}>
                  <th className="border-b border-gray-300 px-2 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-gray-500">
                    Rated Images
                  </th>
                  <th className="border-b border-gray-300 px-2 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-green-700">
                    Success
                  </th>
                  <th className="border-b border-r border-gray-300 px-2 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-red-600">
                    Fail
                  </th>
                </Fragment>
              ))}
            </tr>
          </thead>

          <tbody>
            {loading && (
              <tr>
                <td
                  colSpan={fullColSpan}
                  className="px-4 py-6 text-center text-sm text-gray-400"
                >
                  Loading comparison data…
                </td>
              </tr>
            )}

            {!loading && categoryRows.length === 0 && (
              <tr>
                <td
                  colSpan={fullColSpan}
                  className="px-4 py-6 text-center text-sm text-gray-400"
                >
                  No product category data available.
                </td>
              </tr>
            )}

            {!loading &&
              categoryRows.map((row) => {
                const isCategory = row.type === 'category';
                const rowKey =
                  row.type === 'category'
                    ? row.categoryName
                    : `${row.categoryName}:${row.issueName}`;

                return (
                  <tr
                    key={rowKey}
                    className={
                      isCategory
                        ? 'bg-white font-semibold'
                        : 'bg-white'
                    }
                  >
                    <th
                      className={`sticky left-0 z-10 border-b border-r border-gray-200 bg-white px-3 py-1.5 text-left ${
                        isCategory
                          ? 'text-[11px] font-bold text-gray-900'
                          : 'pl-6 text-[11px] font-normal text-gray-500'
                      }`}
                    >
                      {isCategory
                        ? formatCategoryName(row.categoryName)
                        : row.issueName}
                    </th>
                    {slices.map((slice) => {
                      const cats = dataBySlice[slice.key]?.categories ?? [];
                      const cat = cats.find(
                        (c) => c.name === row.categoryName,
                      );

                      if (isCategory) {
                        return (
                          <Fragment key={slice.key}>
                            <td className="border-b border-gray-200 px-2 py-1.5 text-center text-[11px] text-gray-700">
                              {cat ? cat.total : '-'}
                            </td>
                            <td className="border-b border-gray-200 px-2 py-1.5 text-center text-[11px] font-medium text-green-700">
                              {cat
                                ? `${cat.success} (${cat.successPct}%)`
                                : '-'}
                            </td>
                            <td className="border-b border-r border-gray-200 px-2 py-1.5 text-center text-[11px] font-medium text-red-600">
                              {cat
                                ? `${cat.failure} (${cat.failurePct}%)`
                                : '-'}
                            </td>
                          </Fragment>
                        );
                      }

                      const issue = cat?.issues.find(
                        (i) => i.issue === row.issueName,
                      );
                      const issuePct =
                        issue && cat && cat.failure > 0
                          ? Math.round((issue.count / cat.failure) * 100)
                          : 0;

                      return (
                        <Fragment key={slice.key}>
                          <td className="border-b border-gray-100 px-2 py-1 text-center" />
                          <td className="border-b border-gray-100 px-2 py-1 text-center" />
                          <td className="border-b border-r border-gray-100 px-2 py-1 text-center text-[11px] text-red-500">
                            {issue ? `${issue.count} (${issuePct}%)` : ''}
                          </td>
                        </Fragment>
                      );
                    })}
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
