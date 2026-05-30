'use client';

import Link from 'next/link';
import { CdnImage } from '@/components/cdn-image';
import { JudgeScoreBadge } from '@/components/judge-score-badge';
import { MatrixCellRatingOverlay } from '@/components/matrix-cell-rating-overlay';
import type { ReviewState } from '@/components/review-badge';
import { ReviewResultsBadge } from '@/components/review-results';
import { ReviewRunGroupBadge } from '@/components/review-run-group-badge';
import { StrategyHoverCard } from '@/components/strategy-hover-card';
import { MaximizeIcon } from '@/components/ui/icons';
import { useBatchReviewStatus } from '@/lib/use-batch-review-status';
import { ReviewStatusBadge } from './batch-review-status-badge';
import { deriveRunReviewStatus, isAwaitingJudgeBatch, type RunRow } from './batch-types';

function getMatrixCellColumns(count: number): number {
  if (count <= 1) return 1;
  if (count <= 4) return 2;
  return 3;
}

/* ─── Matrix view: preset rows × strategy columns, first image only, click to expand ─── */

export function MatrixView({
  runs,
  numberOfImages,
  retryingRunId,
  onRetry,
  onRated,
  onImageClick,
  expanded,
}: {
  runs: RunRow[];
  numberOfImages: number;
  retryingRunId: string | null;
  onRetry: (runId: string) => void;
  onRated?: () => void;
  onImageClick: (run: RunRow) => void;
  expanded?: boolean;
}) {
  const awaitingJudge = isAwaitingJudgeBatch(runs, numberOfImages);
  const strategyNames: string[] = [];
  const strategyIds: string[] = [];
  const seen = new Set<string>();
  for (const run of runs) {
    if (!seen.has(run.strategyId)) {
      seen.add(run.strategyId);
      strategyNames.push(run.strategyName ?? run.strategyId);
      strategyIds.push(run.strategyId);
    }
  }

  const rowKeys = new Set<string>();
  const matrixRowLabels = new Map<string, string>();
  for (const run of runs) {
    const rowKey =
      run.source === 'benchmark' && run.batchRunId
        ? run.batchRunId
        : (run.inputPresetName ?? '(no preset)');
    rowKeys.add(rowKey);
    matrixRowLabels.set(rowKey, run.inputPresetName ?? '(no preset)');
  }
  const sortedPresets = Array.from(rowKeys).sort();

  const grid = new Map<string, RunRow[]>();
  for (const run of runs) {
    const rowKey =
      run.source === 'benchmark' && run.batchRunId
        ? run.batchRunId
        : (run.inputPresetName ?? '(no preset)');
    const key = `${rowKey}\0${run.strategyId}`;
    if (!grid.has(key)) grid.set(key, []);
    grid.get(key)!.push(run);
  }
  for (const arr of grid.values()) {
    arr.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  const CELL = 240;

  // For the inline "Run segmentation" pill under each preset row label,
  // collect *every* generation id across every strategy column for that
  // row. Clicking the pill fans out a parallel POST per id so every cell
  // ends up with its own masks instead of just the leftmost one.
  const matrixRowGenerationIds = new Map<string, string[]>();
  for (const rowKey of sortedPresets) {
    const ids: string[] = [];
    for (const stratId of strategyIds) {
      const cellRuns = grid.get(`${rowKey}\0${stratId}`) ?? [];
      for (const run of cellRuns) {
        if (run.lastOutputGenerationId) ids.push(run.lastOutputGenerationId);
      }
    }
    if (ids.length > 0) matrixRowGenerationIds.set(rowKey, ids);
  }
  // Hydrate status for *every* run's generation id so each cell's masks
  // badge can reflect that specific run, while the inline pill still uses
  // the canonical row id above.
  const segmentationGenerationIds = runs.map((r) => r.lastOutputGenerationId ?? null);
  const { statuses: segmentationStatuses, setStatus: setSegmentationStatus } = useBatchReviewStatus(
    segmentationGenerationIds,
    !!expanded,
  );

  return (
    <div className="rounded-card border-border overflow-x-auto overflow-y-hidden border">
      <table
        className="divide-border divide-y"
        style={{ borderCollapse: 'separate', borderSpacing: 0 }}
      >
        <thead className="bg-surface-muted">
          <tr>
            <th
              className="border-border bg-surface-muted text-caption text-text-secondary sticky left-0 z-20 border-r px-4 py-2.5 text-left font-medium tracking-wider uppercase"
              style={{ minWidth: 200, maxWidth: 200 }}
            >
              Input preset
            </th>
            {strategyNames.map((name, i) => (
              <th
                key={strategyIds[i]}
                className="text-caption text-text-secondary px-2 py-2.5 text-center font-medium tracking-wider"
                style={{ minWidth: CELL }}
              >
                <StrategyHoverCard strategyId={strategyIds[i]}>
                  <Link
                    href={`/strategies/${strategyIds[i]}`}
                    className="text-primary-600 hover:text-primary-500"
                  >
                    {name}
                  </Link>
                </StrategyHoverCard>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-border bg-surface divide-y">
          {sortedPresets.map((rowKey) => (
            <tr key={rowKey} className="hover:bg-surface-muted/50">
              <td
                className="border-border bg-surface text-body text-text-primary sticky left-0 z-20 border-r px-4 py-2 font-medium"
                style={{ minWidth: 200, maxWidth: 200 }}
              >
                <span className="block break-words">{matrixRowLabels.get(rowKey) ?? rowKey}</span>
                <MatrixRowSegmentationBadge
                  generationIds={matrixRowGenerationIds.get(rowKey) ?? []}
                  statuses={segmentationStatuses}
                  setStatus={setSegmentationStatus}
                />
              </td>
              {strategyIds.map((stratId) => {
                const cellRuns = grid.get(`${rowKey}\0${stratId}`) ?? [];
                const firstRun = cellRuns[0];
                const outputRuns = cellRuns.filter(
                  (run): run is RunRow & { lastOutputUrl: string } => !!run.lastOutputUrl,
                );
                return (
                  <td
                    key={stratId}
                    className="border-border-subtle border-l p-1.5 text-center align-middle"
                    style={{ width: CELL, height: CELL, minWidth: CELL }}
                  >
                    <div className="flex h-full w-full flex-col items-center justify-center gap-1">
                      {!firstRun ? (
                        <span className="text-text-disabled">&mdash;</span>
                      ) : outputRuns.length > 1 ? (
                        <div
                          className="grid gap-1"
                          style={{
                            width: CELL - 20,
                            gridTemplateColumns: `repeat(${getMatrixCellColumns(outputRuns.length)}, minmax(0, 1fr))`,
                          }}
                        >
                          {outputRuns.map((run) => (
                            <button
                              key={run.id}
                              type="button"
                              onClick={() => onImageClick(run)}
                              className="group relative block aspect-square cursor-pointer"
                            >
                              <CdnImage
                                src={run.lastOutputUrl}
                                alt=""
                                fill
                                sizes="(max-width:768px) 25vw, 150px"
                                className={`rounded-md object-cover shadow-sm transition-shadow hover:shadow-md ${run.isJudgeSelected ? 'border-warning-400 ring-warning-200 border-2 ring-2' : 'border-border border'}`}
                              />
                              <div className="absolute inset-0 flex items-center justify-center rounded-md bg-black/0 transition-colors group-hover:bg-black/20">
                                <MaximizeIcon className="size-5 text-white opacity-0 drop-shadow transition-opacity group-hover:opacity-100" />
                              </div>
                              <JudgeScoreBadge
                                runId={run.id}
                                judgeScore={run.judgeScore}
                                isJudgeSelected={run.isJudgeSelected}
                                judgeReasoning={run.judgeReasoning}
                                judgeOutput={run.judgeOutput}
                                judgeSystemPrompt={run.judgeSystemPrompt}
                                judgeUserPrompt={run.judgeUserPrompt}
                                judgeTypeUsed={run.judgeTypeUsed}
                                awaitingJudge={awaitingJudge}
                              />
                              <ReviewResultsBadge
                                generationId={run.lastOutputGenerationId ?? null}
                                state={
                                  run.lastOutputGenerationId
                                    ? segmentationStatuses.get(run.lastOutputGenerationId)
                                    : undefined
                                }
                              />
                              {run.lastOutputGenerationId && (
                                <MatrixCellRatingOverlay
                                  generationId={run.lastOutputGenerationId}
                                  onRated={onRated}
                                />
                              )}
                            </button>
                          ))}
                        </div>
                      ) : firstRun.lastOutputUrl ? (
                        <div className="group relative block">
                          <button
                            type="button"
                            onClick={() => onImageClick(firstRun)}
                            className="relative block cursor-pointer"
                          >
                            <CdnImage
                              src={firstRun.lastOutputUrl}
                              alt=""
                              width={CELL - 20}
                              height={CELL - 20}
                              className={`rounded-lg object-cover shadow-sm transition-shadow hover:shadow-md ${firstRun.isJudgeSelected ? 'border-warning-400 ring-warning-200 border-2 ring-2' : 'border-border border'}`}
                            />
                            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/0 transition-colors group-hover:bg-black/20">
                              <MaximizeIcon className="size-8 text-white opacity-0 drop-shadow transition-opacity group-hover:opacity-100" />
                            </div>
                          </button>
                          <JudgeScoreBadge
                            runId={firstRun.id}
                            judgeScore={firstRun.judgeScore}
                            isJudgeSelected={firstRun.isJudgeSelected}
                            judgeReasoning={firstRun.judgeReasoning}
                            judgeOutput={firstRun.judgeOutput}
                            judgeSystemPrompt={firstRun.judgeSystemPrompt}
                            judgeUserPrompt={firstRun.judgeUserPrompt}
                            judgeTypeUsed={firstRun.judgeTypeUsed}
                            awaitingJudge={awaitingJudge}
                          />
                          <ReviewResultsBadge
                            generationId={firstRun.lastOutputGenerationId ?? null}
                            state={
                              firstRun.lastOutputGenerationId
                                ? segmentationStatuses.get(firstRun.lastOutputGenerationId)
                                : undefined
                            }
                          />
                          {firstRun.lastOutputGenerationId && (
                            <MatrixCellRatingOverlay
                              generationId={firstRun.lastOutputGenerationId}
                              onRated={onRated}
                            />
                          )}
                        </div>
                      ) : (
                        <>
                          <Link
                            href={
                              firstRun.runHref ??
                              `/strategies/${firstRun.strategyId}/runs/${firstRun.id}`
                            }
                          >
                            <ReviewStatusBadge status={deriveRunReviewStatus(firstRun)} />
                          </Link>
                          {(firstRun.status === 'failed' || firstRun.status === 'skipped') && (
                            <button
                              type="button"
                              onClick={() => onRetry(firstRun.id)}
                              disabled={retryingRunId === firstRun.id}
                              className="text-caption text-warning-700 hover:text-warning-600 font-medium disabled:opacity-50"
                            >
                              {retryingRunId === firstRun.id ? 'Retrying…' : 'Retry'}
                            </button>
                          )}
                        </>
                      )}
                    </div>
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

/**
 * Helper for the matrix row's segmentation badge cell. Lives outside the
 * giant `MatrixView` JSX tree so the inline JSX in the row stays compact
 * (segmentation is a leftmost-column concern; cell columns are per-strategy).
 */
function MatrixRowSegmentationBadge({
  generationIds,
  statuses,
  setStatus,
}: {
  generationIds: string[];
  statuses: Map<string, ReviewState>;
  setStatus: (id: string, state: ReviewState) => void;
}) {
  if (generationIds.length === 0) return null;
  return (
    <ReviewRunGroupBadge generationIds={generationIds} statuses={statuses} setStatus={setStatus} />
  );
}
