'use client';

import {
  formatComparisonRange,
  formatComparisonSource,
  type AnalyticsComparisonSlice,
} from '@/app/analytics/comparison-utils';
import { SLICE_BG_COLORS } from './helpers';
import type { SliceData } from './types';

export function SceneIssuesTable({
  slices,
  dataBySlice,
  loading,
  sceneIssueRows,
}: {
  slices: AnalyticsComparisonSlice[];
  dataBySlice: Record<string, SliceData>;
  loading: boolean;
  sceneIssueRows: string[];
}) {
  const colCount = slices.length;

  return (
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
            <th
              aria-label="Issue"
              className="w-48 min-w-[180px] border-r border-b border-gray-300 bg-white px-3 py-2"
            />
            {slices.map((slice, i) => {
              const color = SLICE_BG_COLORS[i % SLICE_BG_COLORS.length];
              return (
                <th
                  key={slice.key}
                  className={`border-r border-b border-gray-300 px-3 py-2.5 text-center ${color.header}`}
                  style={{ minWidth: 160 }}
                >
                  <div className="text-xs font-bold text-gray-900">{slice.strategyName}</div>
                  <div className="mt-0.5 text-[10px] font-medium text-gray-600">
                    {formatComparisonSource(slice.source)} ({formatComparisonRange(slice.range)})
                  </div>
                </th>
              );
            })}
          </tr>
          {/* Scene Accuracy Overall */}
          <tr className="bg-gray-50/60">
            <th className="border-r border-b border-gray-200 px-3 py-1.5 text-left text-[11px] font-semibold text-gray-700">
              Overall
            </th>
            {slices.map((slice, i) => {
              const s = dataBySlice[slice.key]?.summary;
              const color = SLICE_BG_COLORS[i % SLICE_BG_COLORS.length];
              return (
                <td
                  key={slice.key}
                  className={`border-r border-b border-gray-200 px-2 py-1.5 text-center text-[11px] ${color.header}`}
                >
                  {s ? (
                    <>
                      <span className="text-gray-500">{s.sceneRatedCount} rated</span>
                      {' · '}
                      <span className="font-semibold text-green-700">{s.sceneGoodPct}%</span>
                      <span className="text-gray-400"> / </span>
                      <span className="font-semibold text-red-600">{s.sceneFailedPct}%</span>
                    </>
                  ) : (
                    '-'
                  )}
                </td>
              );
            })}
          </tr>
          <tr className="bg-gray-100">
            <th className="sticky left-0 z-10 border-r border-b border-gray-300 bg-gray-100 px-3 py-2 text-left text-[10px] font-bold tracking-wider text-gray-600 uppercase">
              Issue
            </th>
            {slices.map((slice) => (
              <th
                key={slice.key}
                className="border-r border-b border-gray-300 p-2 text-center text-[10px] font-bold tracking-wider text-gray-500 uppercase"
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
              <td colSpan={1 + colCount} className="p-4 text-center text-sm text-gray-400">
                No scene accuracy issues found.
              </td>
            </tr>
          )}
          {!loading &&
            sceneIssueRows.map((issueName) => (
              <tr key={issueName} className="bg-white">
                <th className="sticky left-0 z-10 border-r border-b border-gray-200 bg-white px-3 py-1.5 text-left text-[11px] font-normal text-gray-700">
                  {issueName}
                </th>
                {slices.map((slice) => {
                  const d = dataBySlice[slice.key];
                  const item = d?.sceneIssues.find((i) => i.issue === issueName);
                  const sceneFailed = d?.summary
                    ? Math.round((d.summary.sceneFailedPct / 100) * d.summary.sceneRatedCount)
                    : 0;
                  const pct =
                    item && sceneFailed > 0 ? Math.round((item.count / sceneFailed) * 100) : 0;
                  return (
                    <td
                      key={slice.key}
                      className="border-r border-b border-gray-200 px-2 py-1.5 text-center text-[11px] text-red-600"
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
  );
}
