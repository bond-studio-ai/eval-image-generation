'use client';

import { useState } from 'react';
import type { EnlargedCell } from './types';
import type { MatrixRunGeneration } from '@/hooks/matrix/strategy-matrix-types';
import { useGenerationRating } from '@/hooks/matrix/use-generation-rating';
import { OutputEvaluationCard } from './output-evaluation-card';

const RATING_OPTIONS = [
  { value: 'GOOD', label: 'Good', className: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-emerald-300' },
  { value: 'FAILED', label: 'Failed', className: 'bg-red-100 text-red-800 hover:bg-red-200 border-red-300' },
] as const;

const selectClassName =
  'w-full cursor-pointer appearance-none rounded-xl border border-gray-200 bg-gray-50/80 py-2.5 pl-3 pr-10 text-sm text-gray-900 transition-colors hover:border-gray-300 hover:bg-gray-50 focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20';

function SelectWrapper({ id, label, value, onChange, children }: { id: string; label: string; value: number; onChange: (v: number) => void; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-gray-500">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className={selectClassName}
        >
          {children}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" aria-hidden>
          <svg className="size-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </span>
      </div>
    </div>
  );
}

interface StrategyMatrixEnlargeDialogProps {
  cell: EnlargedCell;
  onClose: () => void;
}

/** One generation tab: rating (Good/Failed) + list of results (image + resultId + evaluation). */
function GenerationPanel({
  generation,
  presetName,
  strategyName,
}: {
  generation: MatrixRunGeneration;
  presetName: string;
  strategyName: string;
}) {
  const [resultIndex, setResultIndex] = useState(0);
  const results = generation.results ?? [];
  const result = results[resultIndex];
  const hasMultipleResults = results.length >1;

  const { sceneRating, productRating, ratingsLoaded, isRating, updateRating } = useGenerationRating(
    generation.generationId
  );

  return (
    <div className="space-y-4">
      {/* Rating for this generation */}
      <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-700">Rating</h3>
        {!ratingsLoaded ? (
          <div className="flex items-center gap-2 py-4 text-sm text-gray-500">
            <span className="inline-block size-4 animate-spin rounded-full border-2 border-gray-300 border-t-primary-600" aria-hidden />
            Loading…
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-medium text-gray-500">Scene accuracy</p>
              <div className="flex flex-wrap gap-2">
                {RATING_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={isRating}
                    onClick={() => updateRating('scene_accuracy_rating', opt.value)}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${opt.className} ${
                      sceneRating === opt.value ? 'ring-2 ring-offset-1 ring-current' : ''
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-gray-500">Product accuracy</p>
              <div className="flex flex-wrap gap-2">
                {RATING_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={isRating}
                    onClick={() => updateRating('product_accuracy_rating', opt.value)}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${opt.className} ${
                      productRating === opt.value ? 'ring-2 ring-offset-1 ring-current' : ''
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results: image(s) + evaluation */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-gray-700">Outputs</h3>
        {hasMultipleResults && (
          <div className="mb-3">
            <SelectWrapper
              id="result-select"
              label="Result"
              value={resultIndex}
              onChange={setResultIndex}
            >
              {results.map((r, i) => (
                <option key={r.resultId} value={i}>
                  Result {i + 1}
                </option>
              ))}
            </SelectWrapper>
          </div>
        )}

        {result ? (
          <>
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <img
                src={result.url ?? ''}
                alt={`${presetName} - ${strategyName}`}
                className="h-auto w-full object-contain"
                crossOrigin="anonymous"
              />
            </div>
           
            <div className="mt-4">
              <OutputEvaluationCard resultId={result.resultId} />
            </div>
          </>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-gray-50 py-6 text-center text-sm text-gray-500">
            No results for this generation.
          </div>
        )}
      </div>
    </div>
  );
}

export function StrategyMatrixEnlargeDialog({ cell, onClose }: StrategyMatrixEnlargeDialogProps) {
  const generations = cell.generations;
  const [genIndex, setGenIndex] = useState(0);
  const activeGen = generations[genIndex];
  const hasMultipleGens = generations.length > 1;

  return (
    <>
      {/* Backdrop: click outside to close */}
      <button
        type="button"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/10 cursor-default"
        aria-label="Close drawer"
      />
      {/* Drawer: left side */}
      <aside
        className="fixed inset-y-0 left-0 z-50 flex w-full max-w-xl flex-col border-r border-gray-200 bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Cell detail"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3">
          <h2 className="text-lg font-semibold text-gray-900 truncate pr-2">
            {cell.presetName} &rarr; {cell.strategyName}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 shrink-0"
            aria-label="Close drawer"
          >
            <svg className="size-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-4">
          {hasMultipleGens && (
            <div className="mb-4">
              <SelectWrapper
                id="generation-select"
                label="Generation"
                value={genIndex}
                onChange={setGenIndex}
              >
                {generations.map((gen, i) => (
                  <option key={gen.generationId} value={i}>
                    Generation {i + 1}
                  </option>
                ))}
              </SelectWrapper>
            </div>
          )}

          {activeGen ? (
            <GenerationPanel
              generation={activeGen}
              presetName={cell.presetName}
              strategyName={cell.strategyName}
            />
          ) : (
            <div className="rounded-lg border border-gray-200 bg-gray-50 py-8 text-center text-sm text-gray-500">
              No generations to display.
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
