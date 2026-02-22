'use client';

import type { EnlargedCell } from './types';
import { ScoreTag } from './score-tag';

interface StrategyMatrixEnlargeDialogProps {
  cell: EnlargedCell;
  onClose: () => void;
}

export function StrategyMatrixEnlargeDialog({ cell, onClose }: StrategyMatrixEnlargeDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Enlarged image"
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h2 className="text-lg font-semibold text-gray-900">
            {cell.presetName} / {cell.strategyName}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close"
          >
            <svg
              className="size-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="overflow-auto p-4">
          <div className="overflow-hidden rounded-lg border-2 border-gray-200">
            <img
              src={cell.imageUrl}
              alt={`${cell.presetName} - ${cell.strategyName}`}
              className="h-auto w-full object-contain"
              crossOrigin="anonymous"
            />
          </div>
          <div className="mt-3 flex items-center gap-2">
            <ScoreTag score={cell.score} status={cell.status} />
          </div>
        </div>
      </div>
    </div>
  );
}
