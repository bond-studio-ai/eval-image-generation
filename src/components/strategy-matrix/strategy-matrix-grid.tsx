'use client';

import Link from 'next/link';
import type { StrategyMatrixResponse } from '@/hooks/matrix/strategy-matrix-types';
import type { StrategySummaryItem } from '@/hooks/matrix/strategy-matrix-types';
import type { EnlargedCell } from './types';
import { StrategyMatrixCell } from './strategy-matrix-cell';
import { StrategySummaryTooltip } from './strategy-summary-tooltip';

const PRESET_COLUMN_WIDTH = 200;
const STRATEGY_COLUMN_WIDTH = 160;

interface StrategyMatrixGridProps {
  data: StrategyMatrixResponse;
  summaryByStrategyId: Map<string, StrategySummaryItem>;
  onEnlarge: (cell: EnlargedCell) => void;
}

function getSummaryForColumn(
  col: { id: string },
  summaryByStrategyId: Map<string, StrategySummaryItem>,
  strategySummary: StrategySummaryItem[]
): StrategySummaryItem | null {
  const summary = summaryByStrategyId.get(col.id) ?? summaryByStrategyId.get(String(col.id));
  if (summary) return summary;
  return strategySummary.find((s) => s.strategyId === col.id || String(s.strategyId) === String(col.id)) ?? null;
}

function getStatusDisplay(cell: { status: string; needsEval: boolean }): string {
  if (cell.needsEval) return 'needs eval';
  return cell.status.toLowerCase().replace(/_/g, ' ');
}

export function StrategyMatrixGrid({
  data,
  summaryByStrategyId,
  onEnlarge,
}: StrategyMatrixGridProps) {
  return (
    <div className="max-h-[70vh] min-h-[320px] overflow-auto rounded-lg border border-gray-200 bg-white">
      <table
        className="w-full border-collapse text-left"
        style={{ minWidth: PRESET_COLUMN_WIDTH + data.columns.length * STRATEGY_COLUMN_WIDTH }}
      >
        <thead>
          <tr className="bg-gray-50">
            <th
              className="sticky left-0 top-0 z-20 border-b border-r border-gray-200 bg-gray-50 px-3 py-3 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]"
              style={{ width: PRESET_COLUMN_WIDTH, minWidth: PRESET_COLUMN_WIDTH }}
            >
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                Presets
              </span>
            </th>
            {data.columns.map((col) => {
              const summary = getSummaryForColumn(col, summaryByStrategyId, data.strategySummary);
              return (
                <th
                  key={col.id}
                  className="sticky top-0 z-10 border-b border-r border-gray-200 bg-gray-50 px-2 py-3 text-center last:border-r-0"
                  style={{ width: STRATEGY_COLUMN_WIDTH, minWidth: STRATEGY_COLUMN_WIDTH }}
                >
                  <div className="flex flex-col items-center gap-0.5">
                    <Link
                      href={`/strategies/${col.id}`}
                      className="text-xs font-semibold text-primary-600 hover:text-primary-500"
                    >
                      {col.name}
                    </Link>
                    <div className="flex items-center gap-1">
                      <StrategySummaryTooltip summary={summary ?? null} />
                    </div>
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {data.matrix.map((row) => (
            <tr key={row.inputPresetId} className="hover:bg-gray-50/50">
              <td
                className="sticky left-0 z-10 border-b border-r border-gray-200 bg-white px-3 py-2 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]"
                style={{ width: PRESET_COLUMN_WIDTH, minWidth: PRESET_COLUMN_WIDTH }}
              >
                <Link
                  href={`/input-presets/${row.inputPresetId}`}
                  className="text-xs font-medium text-primary-600 hover:text-primary-500 "
                >
                  {row.name}
                </Link>
              </td>
              {data.columns.map((strategy) => {
                const cell = row.cells.find((c) => c.strategyId === strategy.id) ?? null;
                const statusDisplay = cell ? getStatusDisplay(cell) : '';
                return (
                  <td
                    key={`${row.inputPresetId}-${strategy.id}`}
                    className="border-b border-r border-gray-200 px-2 py-2 align-top last:border-r-0"
                    style={{ width: STRATEGY_COLUMN_WIDTH, minWidth: STRATEGY_COLUMN_WIDTH }}
                  >
                    <StrategyMatrixCell
                      cell={cell}
                      statusDisplay={statusDisplay}
                      presetName={row.name}
                      strategyName={strategy.name}
                      onEnlarge={() => {
                        if (cell?.outputUrl) {
                          onEnlarge({
                            imageUrl: cell.outputUrl,
                            presetName: row.name,
                            strategyName: strategy.name,
                            score: cell.percentage,
                            status: getStatusDisplay(cell),
                          });
                        }
                      }}
                    />
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
