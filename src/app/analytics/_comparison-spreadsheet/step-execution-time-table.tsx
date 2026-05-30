'use client';

import { useMemo } from 'react';
import {
  formatComparisonRange,
  formatComparisonSource,
  type AnalyticsComparisonSlice,
} from '@/app/analytics/comparison-utils';
import { defaultStepLabel, formatExecMs, SLICE_BG_COLORS } from './helpers';
import type { SliceData } from './types';

export function StepExecutionTimeTable({
  slices,
  dataBySlice,
  loading,
}: {
  slices: AnalyticsComparisonSlice[];
  dataBySlice: Record<string, SliceData>;
  loading: boolean;
}) {
  const colCount = slices.length;

  const maxStepCount = useMemo(() => {
    let max = 0;
    for (const slice of slices) {
      const data = dataBySlice[slice.key];
      if (data && data.steps.length > max) max = data.steps.length;
    }
    return max;
  }, [slices, dataBySlice]);

  const totalsBySlice = useMemo(() => {
    const totals: Record<string, { avgMs: number | null; sampleCount: number }> = {};
    for (const slice of slices) {
      const data = dataBySlice[slice.key];
      if (!data) {
        totals[slice.key] = { avgMs: null, sampleCount: 0 };
        continue;
      }
      let sum = 0;
      let any = false;
      let runs = 0;
      for (const step of data.steps) {
        if (step.avgExecTimeMs !== null) {
          sum += step.avgExecTimeMs;
          any = true;
        }
        if (step.sampleCount > runs) runs = step.sampleCount;
      }
      totals[slice.key] = { avgMs: any ? Math.round(sum) : null, sampleCount: runs };
    }
    return totals;
  }, [slices, dataBySlice]);

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-300 bg-white shadow-xs">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            <th
              colSpan={1 + colCount}
              className="border-b border-gray-300 bg-gray-50 px-4 py-3 text-left text-sm font-bold text-gray-900"
            >
              Avg Execution Time
            </th>
          </tr>
          <tr>
            <th
              aria-label="Step"
              className="w-48 min-w-[180px] border-r border-b border-gray-300 bg-white px-3 py-2"
            />
            {slices.map((slice, i) => {
              const color = SLICE_BG_COLORS[i % SLICE_BG_COLORS.length];
              return (
                <th
                  key={slice.key}
                  className={`border-r border-b border-gray-300 px-3 py-2.5 text-center ${color.header}`}
                  style={{ minWidth: 200 }}
                >
                  <div className="text-xs font-bold text-gray-900">{slice.strategyName}</div>
                  <div className="mt-0.5 text-[10px] font-medium text-gray-600">
                    {formatComparisonSource(slice.source)} ({formatComparisonRange(slice.range)})
                  </div>
                </th>
              );
            })}
          </tr>
          <tr className="bg-gray-100">
            <th className="sticky left-0 z-10 border-r border-b border-gray-300 bg-gray-100 px-3 py-2 text-left text-[10px] font-bold tracking-wider text-gray-600 uppercase">
              Step
            </th>
            {slices.map((slice) => (
              <th
                key={slice.key}
                className="border-r border-b border-gray-300 p-2 text-center text-[10px] font-bold tracking-wider text-gray-500 uppercase"
              >
                Avg time (n)
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan={1 + colCount} className="px-4 py-6 text-center text-sm text-gray-400">
                Loading step times…
              </td>
            </tr>
          )}
          {!loading && maxStepCount === 0 && (
            <tr>
              <td colSpan={1 + colCount} className="p-4 text-center text-sm text-gray-400">
                No step execution data available for the selected ranges.
              </td>
            </tr>
          )}
          {!loading &&
            Array.from({ length: maxStepCount }).map((_, idx) => {
              const stepIndex = idx;
              return (
                <tr key={stepIndex} className="bg-white">
                  <th className="sticky left-0 z-10 border-r border-b border-gray-200 bg-white px-3 py-1.5 text-left text-[11px] font-medium text-gray-700">
                    Step {stepIndex + 1}
                  </th>
                  {slices.map((slice) => {
                    const data = dataBySlice[slice.key];
                    const step = data?.steps[stepIndex];
                    if (!step) {
                      return (
                        <td
                          key={slice.key}
                          className="border-r border-b border-gray-200 px-2 py-1.5 text-center text-[11px] text-gray-400"
                        >
                          -
                        </td>
                      );
                    }
                    return (
                      <td
                        key={slice.key}
                        className="border-r border-b border-gray-200 px-2 py-1.5 text-center text-[11px]"
                      >
                        <div className="font-semibold text-gray-900">
                          {formatExecMs(step.avgExecTimeMs)}
                          {step.sampleCount > 0 && (
                            <span className="ml-1 font-normal text-gray-500">
                              (n={step.sampleCount})
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-gray-500">
                          {defaultStepLabel(step)}
                          {step.type === 'judge' ? ' · judge' : ''}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          {!loading && maxStepCount > 0 && (
            <tr className="bg-gray-50">
              <th className="sticky left-0 z-10 border-t border-r border-gray-300 bg-gray-50 px-3 py-2 text-left text-[11px] font-bold text-gray-800">
                Total (sum of step averages)
              </th>
              {slices.map((slice) => {
                const total = totalsBySlice[slice.key];
                return (
                  <td
                    key={slice.key}
                    className="border-t border-r border-gray-300 p-2 text-center text-[11px] font-semibold text-gray-900"
                  >
                    {total ? formatExecMs(total.avgMs) : '-'}
                  </td>
                );
              })}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
