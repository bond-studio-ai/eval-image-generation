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

/* ─── List view: strategy sections → preset rows × #N columns ─── */

export function ListView({
  runs,
  numberOfImages,
  isSingleStrategy,
  retryingRunId,
  onRetry,
  onRated,
  onImageClick,
  expanded,
}: {
  runs: RunRow[];
  numberOfImages: number;
  isSingleStrategy?: boolean;
  expanded?: boolean;
  retryingRunId: string | null;
  onRetry: (runId: string) => void;
  onRated?: () => void;
  onImageClick: (run: RunRow) => void;
}) {
  const awaitingJudge = isAwaitingJudgeBatch(runs, numberOfImages);
  const strategyOrder: string[] = [];
  const strategyLabels = new Map<string, string>();
  for (const run of runs) {
    if (!strategyLabels.has(run.strategyId)) {
      strategyOrder.push(run.strategyId);
      strategyLabels.set(run.strategyId, run.strategyName ?? run.strategyId);
    }
  }

  const grouped = new Map<string, Map<string, RunRow[]>>();
  const rowLabels = new Map<string, string>();
  for (const run of runs) {
    if (!grouped.has(run.strategyId)) grouped.set(run.strategyId, new Map());
    const byPreset = grouped.get(run.strategyId)!;
    const rowKey =
      run.source === 'benchmark' && run.batchRunId
        ? run.batchRunId
        : (run.inputPresetName ?? '(no preset)');
    const label = run.inputPresetName ?? '(no preset)';
    rowLabels.set(rowKey, label);
    if (!byPreset.has(rowKey)) byPreset.set(rowKey, []);
    byPreset.get(rowKey)!.push(run);
  }
  for (const byPreset of grouped.values()) {
    for (const arr of byPreset.values()) {
      arr.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }
  }

  const CELL = 240;

  // Hydrate segmentation status for every run's generation id (not just
  // the canonical-per-row one) so each per-cell masks badge can reflect
  // that specific run's status. The hook dedupes by id internally.
  const segmentationGenerationIds = runs.map((r) => r.lastOutputGenerationId ?? null);
  const { statuses: segmentationStatuses, setStatus: setSegmentationStatus } = useBatchReviewStatus(
    segmentationGenerationIds,
    !!expanded,
  );

  return (
    <div className="space-y-6">
      {strategyOrder.map((stratId) => {
        const byPreset = grouped.get(stratId)!;
        const presetNames = Array.from(byPreset.keys()).sort();
        const maxExec = Math.max(0, ...Array.from(byPreset.values()).map((a) => a.length));

        return (
          <div key={stratId}>
            {!isSingleStrategy && (
              <h3 className="text-body text-text-primary mb-2 font-semibold">
                <StrategyHoverCard strategyId={stratId}>
                  <Link
                    href={`/strategies/${stratId}`}
                    className="text-primary-600 hover:text-primary-500"
                  >
                    {strategyLabels.get(stratId)}
                  </Link>
                </StrategyHoverCard>
              </h3>
            )}
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
                    {Array.from({ length: maxExec }, (_, i) => (
                      <th
                        key={i}
                        className="text-caption text-text-secondary px-2 py-2.5 text-center font-medium tracking-wider uppercase"
                        style={{ width: CELL, minWidth: CELL }}
                      >
                        #{i + 1}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-border bg-surface divide-y">
                  {presetNames.map((rowKey) => {
                    const presetRuns = byPreset.get(rowKey)!;
                    const displayLabel = rowLabels.get(rowKey) ?? rowKey;
                    // Segment *every* execution in the row, not just the
                    // canonical/first one — the row's "Run segmentation"
                    // pill fans out to all of these generations in
                    // parallel so each #N column gets its masks.
                    const rowGenerationIds = presetRuns
                      .map((r) => r.lastOutputGenerationId)
                      .filter((id): id is string => !!id);
                    return (
                      <tr key={rowKey} className="hover:bg-surface-muted/50">
                        <td
                          className="border-border bg-surface text-body text-text-primary sticky left-0 z-20 border-r px-4 py-2 font-medium"
                          style={{ minWidth: 200, maxWidth: 200 }}
                        >
                          <span className="block break-words">{displayLabel}</span>
                          {rowGenerationIds.length > 0 && (
                            <ReviewRunGroupBadge
                              generationIds={rowGenerationIds}
                              statuses={segmentationStatuses}
                              setStatus={setSegmentationStatus}
                            />
                          )}
                        </td>
                        {Array.from({ length: maxExec }, (_, i) => {
                          const cellRun = presetRuns[i];
                          const cellGenerationId = cellRun?.lastOutputGenerationId ?? null;
                          return (
                            <RunCell
                              key={i}
                              run={cellRun}
                              cellSize={CELL}
                              awaitingJudge={awaitingJudge}
                              retryingRunId={retryingRunId}
                              onRetry={onRetry}
                              onRated={onRated}
                              onImageClick={onImageClick}
                              segmentationState={
                                cellGenerationId
                                  ? segmentationStatuses.get(cellGenerationId)
                                  : undefined
                              }
                            />
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Shared cell renderer ─── */

function RunCell({
  run,
  cellSize,
  awaitingJudge,
  retryingRunId,
  onRetry,
  onRated,
  onImageClick,
  segmentationState,
}: {
  run: RunRow | undefined;
  cellSize: number;
  awaitingJudge?: boolean;
  retryingRunId: string | null;
  onRetry: (runId: string) => void;
  onRated?: () => void;
  onImageClick: (run: RunRow) => void;
  segmentationState?: ReviewState;
}) {
  return (
    <td
      className="border-border-subtle border-l p-1.5 text-center align-middle"
      style={{ width: cellSize, height: cellSize, minWidth: cellSize }}
    >
      <div className="flex h-full w-full flex-col items-center justify-center gap-1">
        {!run ? (
          <span className="text-text-disabled">&mdash;</span>
        ) : run.lastOutputUrl ? (
          <div className="group relative block">
            <button
              type="button"
              onClick={() => onImageClick(run)}
              className="relative block cursor-pointer"
            >
              <CdnImage
                src={run.lastOutputUrl}
                alt=""
                width={cellSize - 20}
                height={cellSize - 20}
                className={`rounded-lg object-cover shadow-sm transition-shadow hover:shadow-md ${run.isJudgeSelected ? 'border-warning-400 ring-warning-200 border-2 ring-2' : 'border-border border'}`}
              />
              <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/0 transition-colors group-hover:bg-black/20">
                <MaximizeIcon className="size-8 text-white opacity-0 drop-shadow transition-opacity group-hover:opacity-100" />
              </div>
            </button>
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
              state={segmentationState}
            />
            {run.lastOutputGenerationId && (
              <MatrixCellRatingOverlay
                generationId={run.lastOutputGenerationId}
                onRated={onRated}
              />
            )}
          </div>
        ) : (
          <>
            <Link href={run.runHref ?? `/strategies/${run.strategyId}/runs/${run.id}`}>
              <ReviewStatusBadge status={deriveRunReviewStatus(run)} />
            </Link>
            {(run.status === 'failed' || run.status === 'skipped') && (
              <button
                type="button"
                onClick={() => onRetry(run.id)}
                disabled={retryingRunId === run.id}
                className="text-caption text-warning-700 hover:text-warning-600 font-medium disabled:opacity-50"
              >
                {retryingRunId === run.id ? 'Retrying…' : 'Retry'}
              </button>
            )}
          </>
        )}
      </div>
    </td>
  );
}
