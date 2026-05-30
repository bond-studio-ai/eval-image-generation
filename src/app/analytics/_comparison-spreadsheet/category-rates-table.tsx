"use client";

import { Fragment } from "react";
import { formatComparisonRange, formatComparisonSource, type AnalyticsComparisonSlice } from "@/app/analytics/comparison-utils";
import { formatCategoryName, SLICE_BG_COLORS } from "./helpers";
import type { CategoryRow, SliceData, SortCol, SortField } from "./types";

function SortArrow({ active, dir }: { active?: boolean; dir?: "asc" | "desc" }) {
  if (!active) return <span className="text-gray-300">{"\u2195"}</span>;
  return <span>{dir === "asc" ? "\u2191" : "\u2193"}</span>;
}

export function CategoryRatesTable({
  slices,
  dataBySlice,
  loading,
  categoryRows,
  categorySort,
  toggleCategorySort
}: {
  slices: AnalyticsComparisonSlice[];
  dataBySlice: Record<string, SliceData>;
  loading: boolean;
  categoryRows: CategoryRow[];
  categorySort: SortCol | null;
  toggleCategorySort: (sliceKey: string, field: SortField) => void;
}) {
  const colCount = slices.length;
  const fullColSpan = 1 + colCount * 3;

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-300 bg-white shadow-xs">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            <th colSpan={fullColSpan} className="border-b border-gray-300 bg-gray-50 px-4 py-3 text-left text-sm font-bold text-gray-900">
              Product Category Success / Failure Rates
            </th>
          </tr>

          {/* Slice group headers */}
          <tr>
            <th aria-label="Category" className="w-48 min-w-[180px] border-r border-b border-gray-300 bg-white px-3 py-2" />
            {slices.map((slice, i) => {
              const color = SLICE_BG_COLORS[i % SLICE_BG_COLORS.length];
              const s = dataBySlice[slice.key]?.summary;
              const ratedCount = s?.productRatedCount ?? 0;
              return (
                <th key={slice.key} colSpan={3} className={`border-r border-b border-gray-300 px-3 py-2.5 text-center ${color.header}`} style={{ minWidth: 320 }}>
                  <div className="text-xs font-bold text-gray-900">{slice.strategyName}</div>
                  <div className="mt-0.5 text-[10px] font-medium text-gray-600">
                    {formatComparisonSource(slice.source)} ({formatComparisonRange(slice.range)})
                  </div>
                  <div className="mt-0.5 text-[10px] font-semibold text-gray-700">{ratedCount} Rated Images</div>
                </th>
              );
            })}
          </tr>

          {/* Overall accuracy row */}
          <tr className="bg-gray-50/60">
            <th className="border-r border-b border-gray-300 px-3 py-1.5 text-left text-[11px] font-semibold text-gray-700">Product Accuracy (Overall)</th>
            {slices.map((slice, i) => {
              const s = dataBySlice[slice.key]?.summary;
              const color = SLICE_BG_COLORS[i % SLICE_BG_COLORS.length];
              return (
                <Fragment key={slice.key}>
                  <td className={`border-b border-gray-300 px-2 py-1.5 text-center text-[11px] text-gray-500 ${color.header}`}>{s?.productRatedCount ?? ""}</td>
                  <td className={`border-b border-gray-300 px-2 py-1.5 text-center text-[11px] font-semibold text-green-700 ${color.header}`}>{s ? `${s.productGoodPct}%` : "-"}</td>
                  <td className={`border-r border-b border-gray-300 px-2 py-1.5 text-center text-[11px] font-semibold text-red-600 ${color.header}`}>{s ? `${s.productFailedPct}%` : "-"}</td>
                </Fragment>
              );
            })}
          </tr>

          {/* Sub-column headers */}
          <tr className="bg-gray-100">
            <th className="sticky left-0 z-10 border-r border-b border-gray-300 bg-gray-100 px-3 py-2 text-left text-[10px] font-bold tracking-wider text-gray-600 uppercase">Category</th>
            {slices.map((slice) => (
              <Fragment key={slice.key}>
                <th className="border-b border-gray-300 p-2 text-center text-[10px] font-bold tracking-wider text-gray-500 uppercase">Rated Images</th>
                <th className="cursor-pointer border-b border-gray-300 p-2 text-center text-[10px] font-bold tracking-wider text-green-700 uppercase select-none hover:bg-gray-200" onClick={() => toggleCategorySort(slice.key, "successPct")}>
                  Success <SortArrow active={categorySort?.sliceKey === slice.key && categorySort.field === "successPct"} dir={categorySort?.dir} />
                </th>
                <th
                  className="cursor-pointer border-r border-b border-gray-300 p-2 text-center text-[10px] font-bold tracking-wider text-red-600 uppercase select-none hover:bg-gray-200"
                  onClick={() => toggleCategorySort(slice.key, "failurePct")}
                >
                  Fail <SortArrow active={categorySort?.sliceKey === slice.key && categorySort.field === "failurePct"} dir={categorySort?.dir} />
                </th>
              </Fragment>
            ))}
          </tr>
        </thead>

        <tbody>
          {loading && (
            <tr>
              <td colSpan={fullColSpan} className="px-4 py-6 text-center text-sm text-gray-400">
                Loading comparison data…
              </td>
            </tr>
          )}

          {!loading && categoryRows.length === 0 && (
            <tr>
              <td colSpan={fullColSpan} className="px-4 py-6 text-center text-sm text-gray-400">
                No product category data available.
              </td>
            </tr>
          )}

          {!loading &&
            categoryRows.map((row) => {
              const isCategory = row.type === "category";
              const rowKey = row.type === "category" ? row.categoryName : `${row.categoryName}:${row.issueName}`;

              return (
                <tr key={rowKey} className={isCategory ? "bg-white font-semibold" : "bg-white"}>
                  <th className={`sticky left-0 z-10 border-r border-b border-gray-200 bg-white px-3 py-1.5 text-left ${isCategory ? "text-[11px] font-bold text-gray-900" : "pl-6 text-[11px] font-normal text-gray-500"}`}>
                    {isCategory ? formatCategoryName(row.categoryName) : row.issueName}
                  </th>
                  {slices.map((slice) => {
                    const cats = dataBySlice[slice.key]?.categories ?? [];
                    const cat = cats.find((c) => c.name === row.categoryName);

                    if (isCategory) {
                      return (
                        <Fragment key={slice.key}>
                          <td className="border-b border-gray-200 px-2 py-1.5 text-center text-[11px] text-gray-700">{cat ? cat.total : "-"}</td>
                          <td className="border-b border-gray-200 px-2 py-1.5 text-center text-[11px] font-medium text-green-700">{cat ? `${cat.success} (${cat.successPct}%)` : "-"}</td>
                          <td className="border-r border-b border-gray-200 px-2 py-1.5 text-center text-[11px] font-medium text-red-600">{cat ? `${cat.failure} (${cat.failurePct}%)` : "-"}</td>
                        </Fragment>
                      );
                    }

                    const issue = cat?.issues.find((i) => i.issue === row.issueName);
                    const issuePct = issue && cat && cat.failure > 0 ? Math.round((issue.count / cat.failure) * 100) : 0;

                    return (
                      <Fragment key={slice.key}>
                        <td aria-hidden="true" tabIndex={-1} className="border-b border-gray-100 px-2 py-1 text-center" />
                        <td aria-hidden="true" tabIndex={-1} className="border-b border-gray-100 px-2 py-1 text-center" />
                        <td className="border-r border-b border-gray-100 px-2 py-1 text-center text-[11px] text-red-500">{issue ? `${issue.count} (${issuePct}%)` : ""}</td>
                      </Fragment>
                    );
                  })}
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
}
