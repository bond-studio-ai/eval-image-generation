'use client';

import { useState } from 'react';
import type { StrategySummaryItem } from '@/hooks/matrix/strategy-matrix-types';
import { useStrategyMatrix } from '@/hooks/matrix/use-strategy-matrix';
import { useStrategyMatrixUrlSync } from '@/hooks/matrix/use-strategy-matrix-url-sync';
import type { EnlargedCell } from './types';
import { StrategyMatrixFilters } from './strategy-matrix-filters';
import { StrategyMatrixGrid } from './strategy-matrix-grid';
import { StrategyMatrixEnlargeDialog } from './strategy-matrix-enlarge-dialog';

function buildSummaryByStrategyId(strategySummary: StrategySummaryItem[] | undefined): Map<string, StrategySummaryItem> {
  const map = new Map<string, StrategySummaryItem>();
  if (!strategySummary?.length) return map;
  for (const s of strategySummary) {
    map.set(String(s.strategyId), s);
  }
  return map;
}

export function StrategyMatrix() {
  const { params, setParams } = useStrategyMatrixUrlSync();
  const { data, isLoading, error } = useStrategyMatrix(params);
  const [enlarged, setEnlarged] = useState<EnlargedCell | null>(null);

  const summaryByStrategyId = buildSummaryByStrategyId(data?.strategySummary);

  return (
    <div className="flex flex-col gap-5">
      <StrategyMatrixFilters params={params} onParamsChange={setParams} />

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error.message}
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center rounded-lg border border-gray-200 bg-white py-16">
          <span className="text-sm text-gray-500">Loading grid…</span>
        </div>
      )}

      {!isLoading && data && (
        <>
          <StrategyMatrixGrid
            data={data}
            summaryByStrategyId={summaryByStrategyId}
            onEnlarge={setEnlarged}
          />
          {data.rows.length === 0 && (
            <p className="text-sm text-gray-500">
              No presets or strategies yet. Add input presets and strategies to see the grid.
            </p>
          )}
        </>
      )}

      {enlarged && (
        <StrategyMatrixEnlargeDialog
          key={`${enlarged.presetName}-${enlarged.strategyName}`}
          cell={enlarged}
          onClose={() => setEnlarged(null)}
        />
      )}
    </div>
  );
}
