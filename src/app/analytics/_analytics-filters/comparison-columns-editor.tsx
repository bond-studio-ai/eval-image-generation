"use client";

import { type AnalyticsComparisonColumn, type AnalyticsComparisonSource, formatComparisonSource } from "@/app/analytics/comparison-utils";
import { DateRangePicker } from "@/components/date-range-picker";
import { PlusIcon, XIcon } from "@/components/ui/icons";
import type { StrategyListItem } from "@/lib/service-client";
import { StrategyDropdown } from "./strategy-dropdown";
import type { UpdateComparisonColumns } from "./types";

const COMPARISON_SOURCE_OPTIONS: AnalyticsComparisonSource[] = ["preset", "raw_input", "benchmark"];

interface ComparisonColumnsEditorProps {
  columns: AnalyticsComparisonColumn[];
  strategies: StrategyListItem[];
  updateComparisonColumns: UpdateComparisonColumns;
  addComparisonColumn: () => void;
}

export function ComparisonColumnsEditor({ columns, strategies, updateComparisonColumns, addComparisonColumn }: ComparisonColumnsEditorProps) {
  return (
    <div className="border-border bg-surface rounded-xl border shadow-xs">
      <div>
        <table className="w-full">
          <thead>
            <tr className="border-border bg-surface-muted/80 border-b">
              <th className="text-text-muted w-10 px-3 py-2.5 text-center text-[10px] font-semibold tracking-wider uppercase">#</th>
              <th className="text-text-muted px-3 py-2.5 text-left text-[10px] font-semibold tracking-wider uppercase" style={{ minWidth: 200 }}>
                Strategy
              </th>
              <th className="text-text-muted px-3 py-2.5 text-left text-[10px] font-semibold tracking-wider uppercase">Date range</th>
              <th className="text-text-muted px-3 py-2.5 text-left text-[10px] font-semibold tracking-wider uppercase">Source</th>
              <th className="w-10 px-3 py-2.5" aria-label="Actions" />
            </tr>
          </thead>
          <tbody className="divide-border-subtle divide-y">
            {columns.map((column, index) => (
              <tr key={column.id} className="group">
                <td className="text-text-disabled text-caption px-3 py-2.5 text-center font-medium">{index + 1}</td>
                <td className="px-3 py-2.5" style={{ minWidth: 200 }}>
                  <StrategyDropdown
                    value={column.strategyId}
                    strategies={strategies}
                    onChange={(strategyId) => {
                      const nextColumns = Array.from(columns);
                      nextColumns[index] = { ...column, strategyId };
                      updateComparisonColumns(nextColumns);
                    }}
                  />
                </td>
                <td className="px-3 py-2.5">
                  <DateRangePicker
                    from={column.from}
                    to={column.to}
                    onChange={(from, to) => {
                      const nextColumns = Array.from(columns);
                      nextColumns[index] = { ...column, from, to };
                      updateComparisonColumns(nextColumns);
                    }}
                    onClear={() => {
                      const nextColumns = Array.from(columns);
                      nextColumns[index] = { ...column, from: "", to: "" };
                      updateComparisonColumns(nextColumns);
                    }}
                  />
                </td>
                <td className="px-3 py-2.5">
                  <div className="border-border bg-surface-muted flex items-center gap-0.5 rounded-lg border p-0.5">
                    {COMPARISON_SOURCE_OPTIONS.map((sourceOption) => (
                      <button
                        key={sourceOption}
                        type="button"
                        onClick={() => {
                          const nextColumns = Array.from(columns);
                          nextColumns[index] = { ...column, source: sourceOption };
                          updateComparisonColumns(nextColumns);
                        }}
                        className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${column.source === sourceOption ? "bg-surface text-text-primary shadow-sm" : "text-text-muted hover:text-text-secondary"}`}
                      >
                        {formatComparisonSource(sourceOption)}
                      </button>
                    ))}
                  </div>
                </td>
                <td className="px-3 py-2.5" aria-label="Actions">
                  <button
                    type="button"
                    aria-label="Remove column"
                    onClick={() => {
                      updateComparisonColumns(columns.filter((_, i) => i !== index));
                    }}
                    disabled={columns.length <= 1}
                    className="text-text-disabled disabled:hover:text-text-disabled hover:bg-danger-50 hover:text-danger-500 rounded-lg p-1 transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <XIcon className="size-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-border-subtle border-t px-4 py-3">
        <button
          type="button"
          onClick={addComparisonColumn}
          className="border-border-strong text-text-secondary hover:bg-surface-muted hover:text-text-secondary hover:border-border-strong text-caption inline-flex items-center gap-2 rounded-lg border border-dashed px-4 py-2 font-medium transition-colors"
        >
          <PlusIcon className="size-3.5" />
          Add column
        </button>
      </div>
    </div>
  );
}
