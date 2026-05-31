"use client";

import { type AnalyticsComparisonSlice, formatComparisonRange, formatComparisonSource } from "@/app/analytics/comparison-utils";
import { SLICE_BG_COLORS } from "./helpers";
import type { SliceData } from "./types";

export function SceneIssuesTable({ slices, dataBySlice, loading, sceneIssueRows }: { slices: AnalyticsComparisonSlice[]; dataBySlice: Record<string, SliceData>; loading: boolean; sceneIssueRows: string[] }) {
  const colCount = slices.length;

  return (
    <div className="border-border-strong bg-surface overflow-x-auto rounded-lg border shadow-xs">
      <table className="text-caption w-full border-collapse">
        <thead>
          <tr>
            <th colSpan={1 + colCount} className="border-border-strong bg-surface-muted text-text-primary text-body border-b px-4 py-3 text-left font-bold">
              Scene Accuracy Issues
            </th>
          </tr>
          <tr>
            <th aria-label="Issue" className="border-border-strong bg-surface w-48 min-w-[180px] border-r border-b px-3 py-2" />
            {slices.map((slice, i) => {
              const color = SLICE_BG_COLORS[i % SLICE_BG_COLORS.length]!;
              return (
                <th key={slice.key} className={`border-border-strong border-r border-b px-3 py-2.5 text-center ${color.header}`} style={{ minWidth: 160 }}>
                  <div className="text-text-primary text-caption font-bold">{slice.strategyName}</div>
                  <div className="text-text-secondary mt-0.5 text-[10px] font-medium">
                    {formatComparisonSource(slice.source)} ({formatComparisonRange(slice.range)})
                  </div>
                </th>
              );
            })}
          </tr>
          {/* Scene Accuracy Overall */}
          <tr className="bg-surface-muted/60">
            <th className="border-border text-text-secondary border-r border-b px-3 py-1.5 text-left text-[11px] font-semibold">Overall</th>
            {slices.map((slice, i) => {
              const summary = dataBySlice[slice.key]?.summary;
              const color = SLICE_BG_COLORS[i % SLICE_BG_COLORS.length]!;
              return (
                <td key={slice.key} className={`border-border border-r border-b px-2 py-1.5 text-center text-[11px] ${color.header}`}>
                  {summary ? (
                    <>
                      <span className="text-text-muted">{summary.sceneRatedCount} rated</span>
                      {" · "}
                      <span className="text-success-700 font-semibold">{summary.sceneGoodPct}%</span>
                      <span className="text-text-disabled"> / </span>
                      <span className="text-danger-600 font-semibold">{summary.sceneFailedPct}%</span>
                    </>
                  ) : (
                    "-"
                  )}
                </td>
              );
            })}
          </tr>
          <tr className="bg-surface-sunken">
            <th className="border-border-strong bg-surface-sunken text-text-secondary sticky left-0 z-10 border-r border-b px-3 py-2 text-left text-[10px] font-bold tracking-wider uppercase">Issue</th>
            {slices.map((slice) => (
              <th key={slice.key} className="border-border-strong text-text-muted border-r border-b p-2 text-center text-[10px] font-bold tracking-wider uppercase">
                Count (% of failed)
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan={1 + colCount} className="text-text-disabled text-body px-4 py-6 text-center">
                Loading…
              </td>
            </tr>
          )}
          {!loading && sceneIssueRows.length === 0 && (
            <tr>
              <td colSpan={1 + colCount} className="text-text-disabled text-body p-4 text-center">
                No scene accuracy issues found.
              </td>
            </tr>
          )}
          {!loading &&
            sceneIssueRows.map((issueName) => (
              <tr key={issueName} className="bg-surface">
                <th className="border-border bg-surface text-text-secondary sticky left-0 z-10 border-r border-b px-3 py-1.5 text-left text-[11px] font-normal">{issueName}</th>
                {slices.map((slice) => {
                  const sliceData = dataBySlice[slice.key];
                  const item = sliceData?.sceneIssues.find((issue) => issue.issue === issueName);
                  const sceneFailed = sliceData?.summary ? Math.round((sliceData.summary.sceneFailedPct / 100) * sliceData.summary.sceneRatedCount) : 0;
                  const pct = item && sceneFailed > 0 ? Math.round((item.count / sceneFailed) * 100) : 0;
                  return (
                    <td key={slice.key} className="border-border text-danger-600 border-r border-b px-2 py-1.5 text-center text-[11px]">
                      {item ? `${item.count} (${pct}%)` : "-"}
                    </td>
                  );
                })}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
