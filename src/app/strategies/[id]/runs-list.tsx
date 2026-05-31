"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { GridLightbox } from "@/components/grid-lightbox";
import { ChevronDownIcon, ChevronRightIcon, RefreshIcon } from "@/components/ui/icons";
import { Spinner } from "@/components/ui/spinner";
import { serviceUrl } from "@/lib/api-base";
import { groupStrategyRuns } from "@/lib/strategy-runs-view";
import { BatchMatrix } from "./runs-list-matrix";
import { type ListItem, normalizeStrategyRuns, type Run } from "./runs-list-model";
import { StatusBadge } from "./status-badge";

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
      setRuns(normalizeStrategyRuns(json.data));
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

  const openLightbox = useCallback(
    (run: Run) => {
      setLightbox({
        src: run.lastOutputUrl!,
        runHref: `/strategies/${strategyId}/runs/${run.id}`,
        generationId: run.lastOutputGenerationId ?? null
      });
    },
    [strategyId]
  );

  const BatchCard = viewMode === "list" ? BatchRunCard : CollapsibleBatchCard;

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
      ) : (
        <div className="mt-4 space-y-4">
          {items.map((item) => (
            <BatchCard key={`batch-${item.id}`} batch={item} strategyId={strategyId} onRated={fetchRunsKeepScroll} onImageClick={openLightbox} />
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

async function readJsonSafe(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function shouldShowRetryJudge(runs: Run[]): boolean {
  const completed = runs.filter((run) => run.status === "completed" && run.lastOutputUrl);
  if (completed.length < 2) return false;
  const hasFailedOrMissing = completed.some((run) => run.judgeScore === 0) || completed.every((run) => run.judgeScore == null);
  if (hasFailedOrMissing) return true;
  return completed.some((run) => !run.judgeResults || run.judgeResults.length === 0);
}

function useBatchRetry(batchId: string, onRated?: () => void) {
  const [retrying, setRetrying] = useState(false);
  const [retryingJudge, setRetryingJudge] = useState(false);
  const [judgeRetryError, setJudgeRetryError] = useState<string | null>(null);

  const handleRetryFailed = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setRetrying(true);
    try {
      const res = await fetch(serviceUrl(`strategy-batch-runs/${batchId}/retry-failed`), {
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
      const res = await fetch(serviceUrl(`strategy-batch-runs/${batchId}/retry-judge`), {
        method: "POST"
      });
      const body = await readJsonSafe(res);
      if (res.ok) {
        const data = (body as { data?: { failedGroups?: number; errors?: string[] } } | null)?.data;
        if (data?.failedGroups && data.failedGroups > 0) {
          setJudgeRetryError(data.errors?.[0] ?? "Judge failed during retry");
        }
      } else {
        const msg = (body as { error?: { message?: string } } | null)?.error?.message ?? `Retry failed (${res.status})`;
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

  const clearJudgeRetryError = () => {
    setJudgeRetryError(null);
  };

  return { retrying, retryingJudge, judgeRetryError, clearJudgeRetryError, handleRetryFailed, handleRetryJudge };
}

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
  const { retrying, retryingJudge, judgeRetryError, clearJudgeRetryError, handleRetryFailed, handleRetryJudge } = useBatchRetry(batch.id, onRated);
  const presetNames = new Set(batch.runs.map((run) => run.inputPresetName ?? "(no preset)"));
  const completedRuns = batch.runs.filter((run) => run.status === "completed").length;
  const failedRuns = batch.runs.filter((run) => run.status === "failed" || run.status === "skipped").length;

  const showRetryJudge = shouldShowRetryJudge(batch.runs);

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
              clearJudgeRetryError();
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
  const { retrying, retryingJudge, judgeRetryError, clearJudgeRetryError, handleRetryFailed, handleRetryJudge } = useBatchRetry(batch.id, onRated);
  const failedRuns = batch.runs.filter((run) => run.status === "failed" || run.status === "skipped").length;

  const showRetryJudge = shouldShowRetryJudge(batch.runs);

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
              clearJudgeRetryError();
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
