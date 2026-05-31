"use client";

import { useMemo } from "react";
import { type AnalyticsComparisonSlice, formatComparisonRange, formatComparisonSource } from "@/app/analytics/comparison-utils";
import { defaultStepLabel, formatExecMs, SLICE_BG_COLORS } from "./helpers";
import type { SliceData } from "./types";

export function StepExecutionTimeTable({ slices, dataBySlice, loading }: { slices: AnalyticsComparisonSlice[]; dataBySlice: Record<string, SliceData>; loading: boolean }) {
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
    <div className="border-border-strong bg-surface overflow-x-auto rounded-lg border shadow-xs">
      <table className="text-caption w-full border-collapse">
        <thead>
          <tr>
            <th colSpan={1 + colCount} className="border-border-strong bg-surface-muted text-text-primary text-body border-b px-4 py-3 text-left font-bold">
              Avg Execution Time
            </th>
          </tr>
          <tr>
            <th aria-label="Step" className="border-border-strong bg-surface w-48 min-w-[180px] border-r border-b px-3 py-2" />
            {slices.map((slice, i) => {
              const color = SLICE_BG_COLORS[i % SLICE_BG_COLORS.length]!;
              return (
                <th key={slice.key} className={`border-border-strong border-r border-b px-3 py-2.5 text-center ${color.header}`} style={{ minWidth: 200 }}>
                  <div className="text-text-primary text-caption font-bold">{slice.strategyName}</div>
                  <div className="text-text-secondary mt-0.5 text-[10px] font-medium">
                    {formatComparisonSource(slice.source)} ({formatComparisonRange(slice.range)})
                  </div>
                </th>
              );
            })}
          </tr>
          <tr className="bg-surface-sunken">
            <th className="border-border-strong bg-surface-sunken text-text-secondary sticky left-0 z-10 border-r border-b px-3 py-2 text-left text-[10px] font-bold tracking-wider uppercase">Step</th>
            {slices.map((slice) => (
              <th key={slice.key} className="border-border-strong text-text-muted border-r border-b p-2 text-center text-[10px] font-bold tracking-wider uppercase">
                Avg time (n)
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan={1 + colCount} className="text-text-disabled text-body px-4 py-6 text-center">
                Loading step times…
              </td>
            </tr>
          )}
          {!loading && maxStepCount === 0 && (
            <tr>
              <td colSpan={1 + colCount} className="text-text-disabled text-body p-4 text-center">
                No step execution data available for the selected ranges.
              </td>
            </tr>
          )}
          {!loading &&
            Array.from({ length: maxStepCount }, (_, idx) => {
              const stepIndex = idx;
              return (
                <tr key={stepIndex} className="bg-surface">
                  <th className="border-border bg-surface text-text-secondary sticky left-0 z-10 border-r border-b px-3 py-1.5 text-left text-[11px] font-medium">Step {stepIndex + 1}</th>
                  {slices.map((slice) => {
                    const data = dataBySlice[slice.key];
                    const step = data?.steps[stepIndex];
                    if (!step) {
                      return (
                        <td key={slice.key} className="border-border text-text-disabled border-r border-b px-2 py-1.5 text-center text-[11px]">
                          -
                        </td>
                      );
                    }
                    return (
                      <td key={slice.key} className="border-border border-r border-b px-2 py-1.5 text-center text-[11px]">
                        <div className="text-text-primary font-semibold">
                          {formatExecMs(step.avgExecTimeMs)}
                          {step.sampleCount > 0 && <span className="text-text-muted ml-1 font-normal">(n={step.sampleCount})</span>}
                        </div>
                        <div className="text-text-muted text-[10px]">
                          {defaultStepLabel(step)}
                          {step.type === "judge" ? " · judge" : ""}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          {!loading && maxStepCount > 0 && (
            <tr className="bg-surface-muted">
              <th className="border-border-strong bg-surface-muted text-text-secondary sticky left-0 z-10 border-t border-r px-3 py-2 text-left text-[11px] font-bold">Total (sum of step averages)</th>
              {slices.map((slice) => {
                const total = totalsBySlice[slice.key];
                return (
                  <td key={slice.key} className="border-border-strong text-text-primary border-t border-r p-2 text-center text-[11px] font-semibold">
                    {total ? formatExecMs(total.avgMs) : "-"}
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
