"use client";

import { Fragment } from "react";
import { type AnalyticsComparisonSlice, formatComparisonRange, formatComparisonSource } from "@/app/analytics/comparison-utils";
import { formatCategoryName, SLICE_BG_COLORS } from "./helpers";
import type { CategoryRow, SliceData, SortCol, SortField } from "./types";

function SortArrow({ active, dir }: { active?: boolean; dir?: "asc" | "desc" | undefined }) {
  if (!active) return <span className="text-text-disabled">{"\u2195"}</span>;
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
    <div className="border-border-strong bg-surface overflow-x-auto rounded-lg border shadow-xs">
      <table className="text-caption w-full border-collapse">
        <thead>
          <tr>
            <th colSpan={fullColSpan} className="border-border-strong bg-surface-muted text-text-primary text-body border-b px-4 py-3 text-left font-bold">
              Product Category Success / Failure Rates
            </th>
          </tr>

          {/* Slice group headers */}
          <tr>
            <th aria-label="Category" className="border-border-strong bg-surface w-48 min-w-[180px] border-r border-b px-3 py-2" />
            {slices.map((slice, i) => {
              const color = SLICE_BG_COLORS[i % SLICE_BG_COLORS.length]!;
              const summary = dataBySlice[slice.key]?.summary;
              const ratedCount = summary?.productRatedCount ?? 0;
              return (
                <th key={slice.key} colSpan={3} className={`border-border-strong border-r border-b px-3 py-2.5 text-center ${color.header}`} style={{ minWidth: 320 }}>
                  <div className="text-text-primary text-caption font-bold">{slice.strategyName}</div>
                  <div className="text-text-secondary mt-0.5 text-[10px] font-medium">
                    {formatComparisonSource(slice.source)} ({formatComparisonRange(slice.range)})
                  </div>
                  <div className="text-text-secondary mt-0.5 text-[10px] font-semibold">{ratedCount} Rated Images</div>
                </th>
              );
            })}
          </tr>

          {/* Overall accuracy row */}
          <tr className="bg-surface-muted/60">
            <th className="border-border-strong text-text-secondary border-r border-b px-3 py-1.5 text-left text-[11px] font-semibold">Product Accuracy (Overall)</th>
            {slices.map((slice, i) => {
              const summary = dataBySlice[slice.key]?.summary;
              const color = SLICE_BG_COLORS[i % SLICE_BG_COLORS.length]!;
              return (
                <Fragment key={slice.key}>
                  <td className={`border-border-strong text-text-muted border-b px-2 py-1.5 text-center text-[11px] ${color.header}`}>{summary?.productRatedCount ?? ""}</td>
                  <td className={`border-border-strong text-success-700 border-b px-2 py-1.5 text-center text-[11px] font-semibold ${color.header}`}>{summary ? `${summary.productGoodPct}%` : "-"}</td>
                  <td className={`border-border-strong text-danger-600 border-r border-b px-2 py-1.5 text-center text-[11px] font-semibold ${color.header}`}>{summary ? `${summary.productFailedPct}%` : "-"}</td>
                </Fragment>
              );
            })}
          </tr>

          {/* Sub-column headers */}
          <tr className="bg-surface-sunken">
            <th className="border-border-strong bg-surface-sunken text-text-secondary sticky left-0 z-10 border-r border-b px-3 py-2 text-left text-[10px] font-bold tracking-wider uppercase">Category</th>
            {slices.map((slice) => (
              <Fragment key={slice.key}>
                <th className="border-border-strong text-text-muted border-b p-2 text-center text-[10px] font-bold tracking-wider uppercase">Rated Images</th>
                <th
                  className="border-border-strong text-success-700 hover:bg-border cursor-pointer border-b p-2 text-center text-[10px] font-bold tracking-wider uppercase select-none"
                  onClick={() => {
                    toggleCategorySort(slice.key, "successPct");
                  }}
                >
                  Success <SortArrow active={categorySort?.sliceKey === slice.key && categorySort.field === "successPct"} dir={categorySort?.dir} />
                </th>
                <th
                  className="border-border-strong text-danger-600 hover:bg-border cursor-pointer border-r border-b p-2 text-center text-[10px] font-bold tracking-wider uppercase select-none"
                  onClick={() => {
                    toggleCategorySort(slice.key, "failurePct");
                  }}
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
              <td colSpan={fullColSpan} className="text-text-disabled text-body px-4 py-6 text-center">
                Loading comparison data…
              </td>
            </tr>
          )}

          {!loading && categoryRows.length === 0 && (
            <tr>
              <td colSpan={fullColSpan} className="text-text-disabled text-body px-4 py-6 text-center">
                No product category data available.
              </td>
            </tr>
          )}

          {!loading &&
            categoryRows.map((row) => {
              const isCategory = row.type === "category";
              const rowKey = row.type === "category" ? row.categoryName : `${row.categoryName}:${row.issueName}`;

              return (
                <tr key={rowKey} className={isCategory ? "bg-surface font-semibold" : "bg-surface"}>
                  <th className={`border-border bg-surface sticky left-0 z-10 border-r border-b px-3 py-1.5 text-left ${isCategory ? "text-text-primary text-[11px] font-bold" : "text-text-muted pl-6 text-[11px] font-normal"}`}>
                    {isCategory ? formatCategoryName(row.categoryName) : row.issueName}
                  </th>
                  {slices.map((slice) => {
                    const cats = dataBySlice[slice.key]?.categories ?? [];
                    const cat = cats.find((category) => category.name === row.categoryName);

                    if (isCategory) {
                      return (
                        <Fragment key={slice.key}>
                          <td className="border-border text-text-secondary border-b px-2 py-1.5 text-center text-[11px]">{cat ? cat.total : "-"}</td>
                          <td className="border-border text-success-700 border-b px-2 py-1.5 text-center text-[11px] font-medium">{cat ? `${cat.success} (${cat.successPct}%)` : "-"}</td>
                          <td className="border-border text-danger-600 border-r border-b px-2 py-1.5 text-center text-[11px] font-medium">{cat ? `${cat.failure} (${cat.failurePct}%)` : "-"}</td>
                        </Fragment>
                      );
                    }

                    const issue = cat?.issues.find((i) => i.issue === row.issueName);
                    const issuePct = issue && cat && cat.failure > 0 ? Math.round((issue.count / cat.failure) * 100) : 0;

                    return (
                      <Fragment key={slice.key}>
                        <td aria-hidden="true" tabIndex={-1} className="border-border-subtle border-b px-2 py-1 text-center" />
                        <td aria-hidden="true" tabIndex={-1} className="border-border-subtle border-b px-2 py-1 text-center" />
                        <td className="border-border-subtle text-danger-500 border-r border-b px-2 py-1 text-center text-[11px]">{issue ? `${issue.count} (${issuePct}%)` : ""}</td>
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
