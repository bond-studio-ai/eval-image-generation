"use client";

import { formatComparisonSource, type AnalyticsComparisonColumn, type AnalyticsComparisonSource } from "@/app/analytics/comparison-utils";
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
    <div className="rounded-xl border border-gray-200 bg-white shadow-xs">
      <div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/80">
              <th className="w-10 px-3 py-2.5 text-center text-[10px] font-semibold tracking-wider text-gray-500 uppercase">#</th>
              <th className="px-3 py-2.5 text-left text-[10px] font-semibold tracking-wider text-gray-500 uppercase" style={{ minWidth: 200 }}>
                Strategy
              </th>
              <th className="px-3 py-2.5 text-left text-[10px] font-semibold tracking-wider text-gray-500 uppercase">Date range</th>
              <th className="px-3 py-2.5 text-left text-[10px] font-semibold tracking-wider text-gray-500 uppercase">Source</th>
              <th className="w-10 px-3 py-2.5" aria-label="Actions" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {columns.map((column, index) => (
              <tr key={column.id} className="group">
                <td className="px-3 py-2.5 text-center text-xs font-medium text-gray-400">{index + 1}</td>
                <td className="px-3 py-2.5" style={{ minWidth: 200 }}>
                  <StrategyDropdown
                    value={column.strategyId}
                    strategies={strategies}
                    onChange={(strategyId) => {
                      const nextColumns = [...columns];
                      nextColumns[index] = { ...column, strategyId };
                      updateComparisonColumns(nextColumns);
                    }}
                  />
                </td>
                <td className="px-3 py-2.5">
                  <DateRangePicker
                    from={column.from}
                    to={column.to}
                    onChange={(f, t) => {
                      const nextColumns = [...columns];
                      nextColumns[index] = { ...column, from: f, to: t };
                      updateComparisonColumns(nextColumns);
                    }}
                    onClear={() => {
                      const nextColumns = [...columns];
                      nextColumns[index] = { ...column, from: "", to: "" };
                      updateComparisonColumns(nextColumns);
                    }}
                  />
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-0.5 rounded-lg border border-gray-200 bg-gray-50 p-0.5">
                    {COMPARISON_SOURCE_OPTIONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => {
                          const nextColumns = [...columns];
                          nextColumns[index] = { ...column, source: s };
                          updateComparisonColumns(nextColumns);
                        }}
                        className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${column.source === s ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                      >
                        {formatComparisonSource(s)}
                      </button>
                    ))}
                  </div>
                </td>
                <td className="px-3 py-2.5" aria-label="Actions">
                  <button
                    type="button"
                    aria-label="Remove column"
                    onClick={() => updateComparisonColumns(columns.filter((_, i) => i !== index))}
                    disabled={columns.length <= 1}
                    className="text-text-disabled disabled:hover:text-text-disabled rounded-lg p-1 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <XIcon className="size-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-t border-gray-100 px-4 py-3">
        <button
          type="button"
          onClick={addComparisonColumn}
          className="inline-flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-2 text-xs font-medium text-gray-600 transition-colors hover:border-gray-400 hover:bg-gray-50 hover:text-gray-700"
        >
          <PlusIcon className="size-3.5" />
          Add column
        </button>
      </div>
    </div>
  );
}
