'use client';

import type { MatrixCell } from '@/hooks/matrix/strategy-matrix-types';
import { ScoreTag } from './score-tag';

interface StrategyMatrixCellProps {
  cell: MatrixCell | null;
  statusDisplay: string;
  presetName: string;
  strategyName: string;
  onEnlarge: () => void;
}

export function StrategyMatrixCell({
  cell,
  statusDisplay,
  presetName,
  strategyName,
  onEnlarge,
}: StrategyMatrixCellProps) {
  const isEmpty = !cell || cell.status === 'NO_RUN';

  if (isEmpty) {
    return (
      <div className="flex min-h-[100px] items-center justify-center">
        <span className="text-xs text-gray-400">--</span>
      </div>
    );
  }

  const imageUrl = cell.outputUrls?.[0];
  const score = cell.percentage;
  const isNeedsEval = statusDisplay.toLowerCase() === 'needs eval';

  return (
    <div className="flex flex-col items-center gap-1.5 py-1">
      <button
        type="button"
        onClick={onEnlarge}
        className={`group relative aspect-4/3 w-full overflow-hidden rounded-md border-2 transition-all hover:shadow-lg ${
          isNeedsEval
            ? 'border-dashed border-amber-400 bg-amber-50/30 hover:border-amber-500 hover:bg-amber-50/50'
            : 'border-gray-200'
        }`}
      >
        {imageUrl ? (
          <>
            <img
              src={imageUrl}
              alt={`${presetName} - ${strategyName}`}
              className="h-full w-full object-cover"
              crossOrigin="anonymous"
              loading="lazy"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/30 group-hover:opacity-100">
              <svg
                className="size-5 text-white drop-shadow"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
              </svg>
            </div>
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gray-100 text-gray-400">
            <span className="text-xs">No image</span>
          </div>
        )}
      </button>
      <ScoreTag score={score} status={statusDisplay} />
    </div>
  );
}
