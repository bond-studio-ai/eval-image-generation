"use client";

import Link from "next/link";
import { CdnImage } from "@/components/cdn-image";
import { JudgeScoreBadge } from "@/components/judge-score-badge";
import { MatrixCellRatingOverlay } from "@/components/matrix-cell-rating-overlay";
import { ReviewBadge } from "@/components/review-badge";
import { ReviewResultsBadge } from "@/components/review-results";
import { MaximizeIcon } from "@/components/ui/icons";
import { useBatchReviewStatus } from "@/lib/use-batch-review-status";
import type { Run } from "./runs-list-model";
import { StatusBadge } from "./status-badge";

const CELL = 240;

export function BatchMatrix({
  runs,
  strategyId,
  awaitingJudge,
  onRated,
  onImageClick,
  expanded
}: {
  runs: Run[];
  strategyId: string;
  awaitingJudge?: boolean;
  onRated?: (() => void) | undefined;
  onImageClick: (run: Run) => void;
  expanded?: boolean;
}) {
  const byPreset = new Map<string, Run[]>();
  for (const run of runs) {
    const key = run.inputPresetName ?? "(no preset)";
    if (!byPreset.has(key)) byPreset.set(key, []);
    byPreset.get(key)!.push(run);
  }
  for (const arr of byPreset.values()) {
    arr.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }
  const presetNames = Array.from(byPreset.keys()).sort();
  const maxExecutions = Math.max(0, ...Array.from(byPreset.values(), (a) => a.length));

  // Hydrate per-run segmentation status when the parent accordion opens.
  // We track *every* run's generation id (not just the canonical-per-row one)
  // so the per-cell masks badge can reflect that specific run's status.
  const segmentationGenerationIds = runs.map((run) => run.lastOutputGenerationId ?? null);
  const { statuses: segmentationStatuses, setStatus: setSegmentationStatus } = useBatchReviewStatus(segmentationGenerationIds, Boolean(expanded));

  return (
    <div className="border-border overflow-x-auto overflow-y-hidden rounded-lg border">
      <table className="divide-border divide-y" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
        <thead className="bg-surface-muted">
          <tr>
            <th className="border-border bg-surface-muted text-text-secondary text-caption sticky left-0 z-20 border-r px-4 py-2.5 text-left font-medium tracking-wider uppercase" style={{ minWidth: 200, maxWidth: 200 }}>
              Input preset
            </th>
            {Array.from({ length: maxExecutions }, (_, i) => (
              <th key={i} className="text-text-secondary text-caption px-2 py-2.5 text-center font-medium tracking-wider uppercase" style={{ width: CELL, minWidth: CELL }}>
                #{i + 1}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-border bg-surface divide-y">
          {presetNames.map((presetName) => {
            const presetRuns = byPreset.get(presetName)!;
            const [canonicalRun] = presetRuns;
            const canonicalGenerationId = canonicalRun?.lastOutputGenerationId ?? null;
            return (
              <tr key={presetName} className="hover:bg-surface-muted/50">
                <td className="border-border bg-surface text-text-primary text-body sticky left-0 z-20 border-r px-4 py-2 font-medium" style={{ minWidth: 200, maxWidth: 200 }}>
                  <span className="block break-words">{presetName}</span>
                  {canonicalGenerationId &&
                    (() => {
                      const state = segmentationStatuses.get(canonicalGenerationId);
                      return (
                        <ReviewBadge
                          generationId={canonicalGenerationId}
                          {...(state === undefined ? {} : { state })}
                          onStateChange={(next) => {
                            setSegmentationStatus(canonicalGenerationId, next);
                          }}
                        />
                      );
                    })()}
                </td>
                {Array.from({ length: maxExecutions }, (_, i) => {
                  const run = presetRuns[i];
                  return (
                    <td key={i} className="border-border-subtle border-l p-1.5 text-center align-middle" style={{ width: CELL, height: CELL, minWidth: CELL }}>
                      <div className="flex h-full w-full flex-col items-center justify-center gap-1">
                        {run ? null : <span className="text-text-disabled">&mdash;</span>}
                        {run?.lastOutputUrl ? (
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                              onImageClick(run);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") onImageClick(run);
                            }}
                            className="group relative block cursor-pointer"
                          >
                            <CdnImage
                              src={run.lastOutputUrl}
                              alt=""
                              width={CELL - 20}
                              height={CELL - 20}
                              className={`rounded-lg object-cover shadow-sm transition-shadow hover:shadow-md ${run.isJudgeSelected ? "border-warning-400 ring-warning-200 border-2 ring-2" : "border-border border"}`}
                            />
                            <div className="bg-overlay/0 group-hover:bg-overlay/20 absolute inset-0 flex items-center justify-center rounded-lg transition-colors">
                              <MaximizeIcon className="text-text-inverse size-8 opacity-0 drop-shadow transition-opacity group-hover:opacity-100" strokeWidth={1.5} />
                            </div>
                            <JudgeScoreBadge
                              runId={run.id}
                              judgeScore={run.judgeScore}
                              isJudgeSelected={run.isJudgeSelected ?? false}
                              judgeReasoning={run.judgeReasoning ?? null}
                              judgeOutput={run.judgeOutput ?? null}
                              judgeSystemPrompt={run.judgeSystemPrompt ?? null}
                              judgeUserPrompt={run.judgeUserPrompt ?? null}
                              judgeTypeUsed={run.judgeTypeUsed ?? null}
                              judgeResults={run.judgeResults ?? null}
                              awaitingJudge={awaitingJudge ?? false}
                            />
                            <ReviewResultsBadge generationId={run.lastOutputGenerationId ?? null} state={run.lastOutputGenerationId ? segmentationStatuses.get(run.lastOutputGenerationId) : undefined} />
                            {run.lastOutputGenerationId && <MatrixCellRatingOverlay generationId={run.lastOutputGenerationId} {...(onRated ? { onRated } : {})} />}
                          </div>
                        ) : null}
                        {run && !run.lastOutputUrl ? (
                          <Link href={`/strategies/${strategyId}/runs/${run.id}`}>
                            <StatusBadge status={run.status} />
                          </Link>
                        ) : null}
                      </div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
