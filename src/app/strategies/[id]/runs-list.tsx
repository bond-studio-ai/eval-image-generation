"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { CdnImage } from "@/components/cdn-image";
import { GridLightbox } from "@/components/grid-lightbox";
import { JudgeScoreBadge } from "@/components/judge-score-badge";
import { MatrixCellRatingOverlay } from "@/components/matrix-cell-rating-overlay";
import { ReviewBadge } from "@/components/review-badge";
import { ReviewResultsBadge } from "@/components/review-results";
import { ChevronDownIcon, ChevronRightIcon, MaximizeIcon, RefreshIcon } from "@/components/ui/icons";
import { Spinner } from "@/components/ui/spinner";
import { serviceUrl } from "@/lib/api-base";
import { parseStrategyRunJudgeResults, type StrategyRunJudgeResultEntry } from "@/lib/strategy-run-judge-results";
import { groupStrategyRuns, type StrategyRunBatchGroup } from "@/lib/strategy-runs-view";
import { useBatchReviewStatus } from "@/lib/use-batch-review-status";

interface StepResult {
  id: string;
  status: string;
}

interface Run {
  id: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
  inputPresetName: string | null;
  lastOutputUrl?: string | null;
  lastOutputGenerationId?: string | null;
  batchRunId?: string | null;
  groupId?: string | null;
  stepResults: StepResult[];
  judgeScore?: number | null;
  isJudgeSelected?: boolean;
  judgeReasoning?: string | null;
  judgeOutput?: string | null;
  judgeSystemPrompt?: string | null;
  judgeUserPrompt?: string | null;
  judgeTypeUsed?: string | null;
  judgeResults?: StrategyRunJudgeResultEntry[] | null;
}

type ListItem = StrategyRunBatchGroup<Run>;

const POLL_INTERVAL = 3000;

export function StrategyRunsList({ strategyId, hasJudge, initialRuns }: { strategyId: string; hasJudge?: boolean; initialRuns: Run[] }) {
  const [runs, setRuns] = useState<Run[]>(initialRuns);
  const [lightbox, setLightbox] = useState<{
    src: string;
    runHref: string;
    generationId: string | null;
  } | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "matrix">("list");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const hasActiveRun = runs.some((run) => run.status === "running" || run.status === "pending");

  const hasAwaitingJudge = hasJudge && groupStrategyRuns(runs, hasJudge).some((group) => group.awaitingJudge);
  const shouldPoll = hasActiveRun || Boolean(hasAwaitingJudge);

  const fetchRuns = useCallback(async () => {
    try {
      const res = await fetch(serviceUrl(`strategies/${strategyId}/runs`), { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as { data?: unknown };
      const raw = (json.data ?? []) as Record<string, unknown>[];
      setRuns(
        raw.map((row) => ({
          ...(row as unknown as Run),
          judgeResults: parseStrategyRunJudgeResults((row as { judgeResults?: unknown }).judgeResults)
        }))
      );
    } catch {
      /* ignore */
    }
  }, [strategyId]);

  useEffect(() => {
    if (shouldPoll) {
      intervalRef.current = setInterval(() => {
        void fetchRuns();
      }, POLL_INTERVAL);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [shouldPoll, fetchRuns]);

  const items: ListItem[] = groupStrategyRuns(runs, hasJudge);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const pendingScrollRef = useRef<number[] | null>(null);

  useLayoutEffect(() => {
    const saved = pendingScrollRef.current;
    if (!saved) return;
    pendingScrollRef.current = null;
    const scrollers = containerRef.current?.querySelectorAll<HTMLElement>(".overflow-x-auto");
    if (!scrollers) return;
    scrollers.forEach((el, i) => {
      if (i < saved.length) el.scrollLeft = saved[i]!;
    });
  });

  const fetchRunsKeepScroll = useCallback(async () => {
    const scrollers = containerRef.current?.querySelectorAll<HTMLElement>(".overflow-x-auto");
    pendingScrollRef.current = scrollers ? Array.from(scrollers, (el) => el.scrollLeft) : [];
    await fetchRuns();
  }, [fetchRuns]);

  return (
    <div ref={containerRef}>
      <div className="flex items-center justify-between">
        <h2 className="text-text-primary text-h3">Runs</h2>
        <div className="flex items-center gap-2">
          <div className="border-border bg-surface-muted flex rounded-lg border p-0.5">
            <button
              type="button"
              onClick={() => {
                setViewMode("list");
              }}
              className={`text-caption rounded-md px-2.5 py-1 font-medium transition-colors ${viewMode === "list" ? "bg-surface text-text-primary shadow-sm" : "text-text-secondary hover:text-text-primary"}`}
            >
              List
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode("matrix");
              }}
              className={`text-caption rounded-md px-2.5 py-1 font-medium transition-colors ${viewMode === "matrix" ? "bg-surface text-text-primary shadow-sm" : "text-text-secondary hover:text-text-primary"}`}
            >
              Matrix
            </button>
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-text-secondary text-body mt-4">No runs yet. Click &ldquo;Run Batch&rdquo; to execute.</p>
      ) : viewMode === "list" ? (
        <div className="mt-4 space-y-4">
          {items.map((item) => (
            <BatchRunCard
              key={`batch-${item.id}`}
              batch={item}
              strategyId={strategyId}
              onRated={fetchRunsKeepScroll}
              onImageClick={(run) => {
                setLightbox({
                  src: run.lastOutputUrl!,
                  runHref: `/strategies/${strategyId}/runs/${run.id}`,
                  generationId: run.lastOutputGenerationId ?? null
                });
              }}
            />
          ))}
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {items.map((item) => (
            <CollapsibleBatchCard
              key={`batch-matrix-${item.id}`}
              batch={item}
              strategyId={strategyId}
              onRated={fetchRunsKeepScroll}
              onImageClick={(run) => {
                setLightbox({
                  src: run.lastOutputUrl!,
                  runHref: `/strategies/${strategyId}/runs/${run.id}`,
                  generationId: run.lastOutputGenerationId ?? null
                });
              }}
            />
          ))}
        </div>
      )}
      {lightbox && (
        <GridLightbox
          src={lightbox.src}
          runHref={lightbox.runHref}
          generationId={lightbox.generationId}
          onRated={() => fetchRunsKeepScroll()}
          onClose={() => {
            setLightbox(null);
          }}
        />
      )}
    </div>
  );
}

/* ─────────── Batch Run Card with embedded matrix ─────────── */

function BatchRunCard({
  batch,
  strategyId,
  onRated,
  onImageClick
}: {
  batch: {
    id: string;
    runs: Run[];
    status: string;
    createdAt: string;
    awaitingJudge: boolean;
    isStandalone: boolean;
  };
  strategyId: string;
  onRated?: () => void;
  onImageClick: (run: Run) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [retryingJudge, setRetryingJudge] = useState(false);
  const [judgeRetryError, setJudgeRetryError] = useState<string | null>(null);
  const presetNames = new Set(batch.runs.map((run) => run.inputPresetName ?? "(no preset)"));
  const completedRuns = batch.runs.filter((run) => run.status === "completed").length;
  const failedRuns = batch.runs.filter((run) => run.status === "failed" || run.status === "skipped").length;

  const showRetryJudge = (() => {
    const completed = batch.runs.filter((run) => run.status === "completed" && run.lastOutputUrl);
    if (completed.length < 2) return false;
    const hasFailedOrMissing = completed.some((run) => run.judgeScore === 0) || completed.every((run) => run.judgeScore == null);
    if (hasFailedOrMissing) return true;
    const missingPerJudge = completed.some((run) => !run.judgeResults || run.judgeResults.length === 0);
    return missingPerJudge;
  })();

  const handleRetryFailed = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setRetrying(true);
    try {
      const res = await fetch(serviceUrl(`strategy-batch-runs/${batch.id}/retry-failed`), {
        method: "POST"
      });
      if (res.ok) onRated?.();
    } catch {
      /* ignore */
    } finally {
      setRetrying(false);
    }
  };

  const handleRetryJudge = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setRetryingJudge(true);
    setJudgeRetryError(null);
    try {
      const res = await fetch(serviceUrl(`strategy-batch-runs/${batch.id}/retry-judge`), {
        method: "POST"
      });
      if (res.ok) {
        const body: unknown = await res.json().catch(() => null);
        const data = (body as { data?: { failedGroups?: number; errors?: string[] } })?.data;
        if (data?.failedGroups && data.failedGroups > 0) {
          setJudgeRetryError(data.errors?.[0] ?? "Judge failed during retry");
        }
      } else {
        const body: unknown = await res.json().catch(() => null);
        const msg = (body as { error?: { message?: string } })?.error?.message ?? `Retry failed (${res.status})`;
        setJudgeRetryError(msg);
      }
      onRated?.();
    } catch (error) {
      setJudgeRetryError(error instanceof Error ? error.message : "Network error");
      onRated?.();
    } finally {
      setRetryingJudge(false);
    }
  };

  return (
    <div className="border-border bg-surface rounded-lg border shadow-xs">
      <button
        type="button"
        onClick={() => {
          setExpanded(!expanded);
        }}
        className="border-border-subtle hover:bg-surface-muted/50 flex w-full items-center justify-between border-b px-5 py-3 text-left"
      >
        <div className="flex items-center gap-3">
          <ChevronRightIcon className={`text-text-disabled size-4 transition-transform ${expanded ? "rotate-90" : ""}`} />
          <span className={`text-caption inline-flex items-center rounded-full px-2 py-0.5 font-medium ${batch.isStandalone ? "bg-surface-sunken text-text-secondary" : "bg-primary-50 text-primary-700"}`}>
            {batch.isStandalone ? "run" : "batch"}
          </span>
          <StatusBadge status={batch.status} />
          <span className="text-text-secondary text-body">
            {batch.runs.length} run{batch.runs.length === 1 ? "" : "s"} &middot; {presetNames.size} preset{presetNames.size === 1 ? "" : "s"}
          </span>
          <span className="text-text-disabled text-caption">
            {completedRuns} completed{failedRuns > 0 ? `, ${failedRuns} failed` : ""}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {failedRuns > 0 && !batch.isStandalone && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleRetryFailed}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") void handleRetryFailed(e as unknown as React.MouseEvent);
              }}
              className={`border-warning-300 bg-warning-50 text-warning-700 hover:bg-warning-100 text-caption inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-medium transition-colors ${retrying ? "pointer-events-none opacity-50" : ""}`}
            >
              {retrying ? <Spinner className="size-3.5" /> : <RefreshIcon className="size-3.5" />}
              Retry Failed ({failedRuns})
            </span>
          )}
          {showRetryJudge && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleRetryJudge}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") void handleRetryJudge(e as unknown as React.MouseEvent);
              }}
              className={`border-primary-300 bg-primary-50 text-primary-700 hover:bg-primary-100 text-caption inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-medium transition-colors ${retryingJudge ? "pointer-events-none opacity-50" : ""}`}
            >
              {retryingJudge ? <Spinner className="size-3.5" /> : <RefreshIcon className="size-3.5" />}
              Retry Judge
            </span>
          )}
          <span className="text-text-disabled text-caption">{new Date(batch.createdAt).toLocaleString()}</span>
        </div>
      </button>
      {judgeRetryError && (
        <div className="border-danger-100 bg-danger-50 flex items-center justify-between border-b px-5 py-2">
          <span className="text-danger-700 text-caption">{judgeRetryError}</span>
          <button
            type="button"
            onClick={() => {
              setJudgeRetryError(null);
            }}
            className="text-danger-400 hover:text-danger-600 text-caption"
          >
            dismiss
          </button>
        </div>
      )}

      {expanded && (
        <div className="p-4">
          <BatchMatrix runs={batch.runs} strategyId={strategyId} awaitingJudge={batch.awaitingJudge} onRated={onRated} onImageClick={onImageClick} expanded={expanded} />
        </div>
      )}
    </div>
  );
}

function CollapsibleBatchCard({
  batch,
  strategyId,
  onRated,
  onImageClick
}: {
  batch: {
    id: string;
    runs: Run[];
    status: string;
    createdAt: string;
    awaitingJudge: boolean;
    isStandalone: boolean;
  };
  strategyId: string;
  onRated?: () => void;
  onImageClick: (run: Run) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [retryingJudge, setRetryingJudge] = useState(false);
  const [judgeRetryError, setJudgeRetryError] = useState<string | null>(null);
  const failedRuns = batch.runs.filter((run) => run.status === "failed" || run.status === "skipped").length;

  const showRetryJudge = (() => {
    const completed = batch.runs.filter((run) => run.status === "completed" && run.lastOutputUrl);
    if (completed.length < 2) return false;
    const hasFailedOrMissing = completed.some((run) => run.judgeScore === 0) || completed.every((run) => run.judgeScore == null);
    if (hasFailedOrMissing) return true;
    const missingPerJudge = completed.some((run) => !run.judgeResults || run.judgeResults.length === 0);
    return missingPerJudge;
  })();

  const handleRetryFailed = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setRetrying(true);
    try {
      const res = await fetch(serviceUrl(`strategy-batch-runs/${batch.id}/retry-failed`), {
        method: "POST"
      });
      if (res.ok) onRated?.();
    } catch {
      /* ignore */
    } finally {
      setRetrying(false);
    }
  };

  const handleRetryJudge = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setRetryingJudge(true);
    setJudgeRetryError(null);
    try {
      const res = await fetch(serviceUrl(`strategy-batch-runs/${batch.id}/retry-judge`), {
        method: "POST"
      });
      if (res.ok) {
        const body: unknown = await res.json().catch(() => null);
        const data = (body as { data?: { failedGroups?: number; errors?: string[] } })?.data;
        if (data?.failedGroups && data.failedGroups > 0) {
          setJudgeRetryError(data.errors?.[0] ?? "Judge failed during retry");
        }
      } else {
        const body: unknown = await res.json().catch(() => null);
        const msg = (body as { error?: { message?: string } })?.error?.message ?? `Retry failed (${res.status})`;
        setJudgeRetryError(msg);
      }
      onRated?.();
    } catch (error) {
      setJudgeRetryError(error instanceof Error ? error.message : "Network error");
      onRated?.();
    } finally {
      setRetryingJudge(false);
    }
  };

  return (
    <div className="border-border bg-surface rounded-lg border shadow-xs">
      <button
        type="button"
        onClick={() => {
          setExpanded(!expanded);
        }}
        className="border-border-subtle hover:bg-surface-muted/50 flex w-full items-center justify-between border-b px-4 py-2 text-left"
      >
        <span className="text-text-secondary text-body font-medium">Batch · {new Date(batch.createdAt).toLocaleString()}</span>
        <div className="flex items-center gap-2">
          {failedRuns > 0 && !batch.isStandalone && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleRetryFailed}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") void handleRetryFailed(e as unknown as React.MouseEvent);
              }}
              className={`border-warning-300 bg-warning-50 text-warning-700 hover:bg-warning-100 text-caption inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-medium transition-colors ${retrying ? "pointer-events-none opacity-50" : ""}`}
            >
              {retrying ? <Spinner className="size-3.5" /> : <RefreshIcon className="size-3.5" />}
              Retry Failed ({failedRuns})
            </span>
          )}
          {showRetryJudge && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleRetryJudge}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") void handleRetryJudge(e as unknown as React.MouseEvent);
              }}
              className={`border-primary-300 bg-primary-50 text-primary-700 hover:bg-primary-100 text-caption inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-medium transition-colors ${retryingJudge ? "pointer-events-none opacity-50" : ""}`}
            >
              {retryingJudge ? <Spinner className="size-3.5" /> : <RefreshIcon className="size-3.5" />}
              Retry Judge
            </span>
          )}
          <StatusBadge status={batch.status} />
          <ChevronDownIcon className={`text-text-disabled size-5 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </div>
      </button>
      {judgeRetryError && (
        <div className="border-danger-100 bg-danger-50 flex items-center justify-between border-b px-4 py-2">
          <span className="text-danger-700 text-caption">{judgeRetryError}</span>
          <button
            type="button"
            onClick={() => {
              setJudgeRetryError(null);
            }}
            className="text-danger-400 hover:text-danger-600 text-caption"
          >
            dismiss
          </button>
        </div>
      )}
      {expanded && (
        <div className="p-4">
          <BatchMatrix runs={batch.runs} strategyId={strategyId} awaitingJudge={batch.awaitingJudge} onRated={onRated} onImageClick={onImageClick} expanded={expanded} />
        </div>
      )}
    </div>
  );
}

/* ─────────── Batch Matrix ─────────── */

function BatchMatrix({
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

  const CELL = 240;

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
            const canonicalRun = presetRuns[0];
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
                        {run ? (
                          run.lastOutputUrl ? (
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
                          ) : (
                            <Link href={`/strategies/${strategyId}/runs/${run.id}`}>
                              <StatusBadge status={run.status} />
                            </Link>
                          )
                        ) : (
                          <span className="text-text-disabled">&mdash;</span>
                        )}
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

const STATUS_BADGE_STYLES: Record<string, string> = {
  pending: "bg-surface-sunken text-text-secondary",
  running: "bg-primary-100 text-primary-700",
  completed: "bg-success-100 text-success-700",
  failed: "bg-danger-100 text-danger-700"
};

function StatusBadge({ status }: { status: string }) {
  return <span className={`text-caption inline-flex items-center rounded-full px-2.5 py-0.5 font-medium ${STATUS_BADGE_STYLES[status] ?? STATUS_BADGE_STYLES["pending"] ?? ""}`}>{status}</span>;
}
