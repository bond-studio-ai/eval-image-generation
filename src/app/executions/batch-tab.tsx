'use client';

import { DateRangePicker } from '@/components/date-range-picker';
import { GridLightbox } from '@/components/grid-lightbox';
import { JudgeScoreBadge } from '@/components/judge-score-badge';
import { MatrixCellRatingOverlay } from '@/components/matrix-cell-rating-overlay';
import type { ReviewState } from '@/components/review-badge';
import { ReviewResultsBadge } from '@/components/review-results';
import { ReviewRunGroupBadge } from '@/components/review-run-group-badge';
import { StrategyHoverCard } from '@/components/strategy-hover-card';
import {
  AlertTriangleIcon,
  Badge,
  Button,
  ChevronRightIcon,
  cn,
  IconButton,
  RotateCcwIcon,
  SegmentedControl,
  Spinner,
  toast,
  TrashIcon,
  useConfirm,
} from '@/components/ui';
import { serviceUrl } from '@/lib/api-base';
import { useBatchReviewStatus } from '@/lib/use-batch-review-status';
import Link from 'next/link';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

interface RunRow {
  id: string;
  batchRunId: string | null;
  strategyId: string;
  strategyName: string | null;
  runHref?: string | null;
  status: string;
  createdAt: string;
  completedAt: string | null;
  inputPresetName: string | null;
  source: string | null;
  lastOutputUrl: string | null;
  lastOutputGenerationId: string | null;
  stepResults: { id: string; status: string }[];
  totalGenerations: number;
  ratedGenerations: number;
  judgeScore: number | null;
  isJudgeSelected: boolean;
  judgeReasoning: string | null;
  judgeOutput: string | null;
  judgeSystemPrompt: string | null;
  judgeUserPrompt: string | null;
  judgeTypeUsed: string | null;
}

interface BatchRow {
  id: string;
  name?: string | null;
  strategyId: string | null;
  strategies: { id: string; name: string }[];
  numberOfImages: number;
  createdAt: string;
  status: string;
  totalRuns: number;
  completedRuns: number;
  failedRuns: number;
  runs: RunRow[];
}

const POLL_INTERVAL = 5000;
const BATCH_PAGE_SIZE = 20;

function getMatrixCellColumns(count: number): number {
  if (count <= 1) return 1;
  if (count <= 4) return 2;
  return 3;
}

function deriveRunReviewStatus(run: RunRow): string {
  if (run.status === 'running' || run.status === 'pending') return 'running';
  if (run.totalGenerations === 0) return 'pending';
  if (run.ratedGenerations === 0) return 'pending';
  if (run.ratedGenerations >= run.totalGenerations) return 'reviewed';
  return 'in_progress';
}

function normalizeBatch(b: Record<string, unknown>): BatchRow {
  const runs = (Array.isArray(b.runs) ? b.runs : []).map((r: Record<string, unknown>) => ({
    ...r,
    batchRunId: (r.batchRunId as string) ?? null,
    source: (r.source as string) ?? null,
    inputPresetName:
      r.inputPresetName ??
      (r.inputPresets as { inputPresetName?: string }[] | undefined)?.[0]?.inputPresetName ??
      null,
  }));
  return { ...b, runs } as BatchRow;
}

export function BatchRunsTab({
  refreshKey,
  source = 'default',
}: {
  refreshKey?: number;
  source?: 'default' | 'benchmark';
}) {
  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'list' | 'matrix'>('list');
  const [retryingRunId, setRetryingRunId] = useState<string | null>(null);
  const [retryingBatchId, setRetryingBatchId] = useState<string | null>(null);
  const [deletingBatchId, setDeletingBatchId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lightbox, setLightbox] = useState<{
    src: string;
    runHref: string;
    generationId: string | null;
  } | null>(null);
  const [appliedFrom, setAppliedFrom] = useState('');
  const [appliedTo, setAppliedTo] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  /** Prior page-1 id set; merge uses it to prune likely deletes when the refreshed page 1 has no new batch ids. */
  const lastFetchedFirstPageIdsRef = useRef<Set<string>>(new Set());

  const fetchBatches = useCallback(
    async (opts: { replace?: boolean; pageToFetch?: number; mergeFirstPage?: boolean } = {}) => {
      const mergeFirstPage = opts.mergeFirstPage === true;
      const replace = mergeFirstPage ? false : (opts.replace ?? true);
      const pageToFetch = mergeFirstPage ? 1 : (opts.pageToFetch ?? 1);
      const limit = BATCH_PAGE_SIZE;
      if (replace && !mergeFirstPage) {
        setFetchError(null);
        if (!loading) {
          setRefreshing(true);
          setExpandedIds(new Set());
        }
      } else if (!replace && !mergeFirstPage) {
        setLoadingMore(true);
      }
      try {
        const params = new URLSearchParams({ page: String(pageToFetch), limit: String(limit) });
        if (appliedFrom) params.set('from', appliedFrom);
        if (appliedTo) params.set('to', appliedTo);
        if (source === 'benchmark') params.set('source', 'benchmark');
        const res = await fetch(serviceUrl(`strategy-batch-runs?${params}`), { cache: 'no-store' });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          const msg = (err as { error?: { message?: string } })?.error?.message;
          setFetchError(
            msg || `Failed to load (${res.status}). Check that the backend is reachable.`,
          );
          if (!mergeFirstPage) setHasMore(false);
          return;
        }
        const json = await res.json();
        const raw = (json.data ?? []) as Record<string, unknown>[];
        const apiHasMore = json.hasMore === true;
        const normalized = raw.map((b) => normalizeBatch(b));
        if (mergeFirstPage) {
          setFetchError(null);
          const priorFirstPageIds = lastFetchedFirstPageIdsRef.current;
          const topIds = new Set(normalized.map((b) => b.id));
          let mergeIncludesNewBatchId = false;
          setBatches((prev) => {
            const prevIds = new Set(prev.map((b) => b.id));
            mergeIncludesNewBatchId = normalized.some((b) => !prevIds.has(b.id));
            const tail = prev.filter((b) => {
              if (topIds.has(b.id)) return false;
              if (priorFirstPageIds.has(b.id) && !mergeIncludesNewBatchId) return false;
              return true;
            });
            return [...normalized, ...tail];
          });
          lastFetchedFirstPageIdsRef.current = new Set(normalized.map((b) => b.id));
          setHasMore((more) => (mergeIncludesNewBatchId ? true : more));
        } else if (replace) {
          setBatches(normalized);
          setPage(1);
          setHasMore(apiHasMore);
          lastFetchedFirstPageIdsRef.current = new Set(normalized.map((b) => b.id));
        } else {
          setBatches((prev) => {
            const existingIds = new Set(prev.map((b) => b.id));
            const added = normalized.filter((b) => !existingIds.has(b.id));
            return [...prev, ...added];
          });
          setPage(pageToFetch);
          setHasMore(apiHasMore);
        }
      } catch (e) {
        setFetchError(
          e instanceof Error ? e.message : 'Network error. Check backend and try again.',
        );
        if (!mergeFirstPage) setHasMore(false);
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [appliedFrom, appliedTo, source],
  );

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    fetchBatches({ replace: false, pageToFetch: page + 1 });
  }, [hasMore, loadingMore, page, fetchBatches]);

  useEffect(() => {
    fetchBatches({ replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedFrom, appliedTo, refreshKey, source]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore || loadingMore) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: '200px', threshold: 0 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, loadingMore, loadMore]);

  const hasActive = batches.some((b) => b.status === 'running');
  const hasAwaitingJudge = batches.some((b) => isAwaitingJudgeBatch(b.runs, b.numberOfImages));
  const shouldPoll = hasActive || hasAwaitingJudge;
  useEffect(() => {
    if (shouldPoll) {
      intervalRef.current = setInterval(
        () => fetchBatches({ mergeFirstPage: true }),
        POLL_INTERVAL,
      );
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [shouldPoll, fetchBatches]);

  const handleDateChange = useCallback((from: string, to: string) => {
    setAppliedFrom(from);
    setAppliedTo(to);
  }, []);

  const handleClearDate = useCallback(() => {
    setAppliedFrom('');
    setAppliedTo('');
  }, []);

  const handleRetry = useCallback(
    async (runId: string) => {
      setRetryingRunId(runId);
      try {
        const res = await fetch(serviceUrl(`strategy-runs/${runId}/retry`), { method: 'POST' });
        if (!res.ok) return;
        await fetchBatches();
      } catch {
        /* ignore */
      } finally {
        setRetryingRunId(null);
      }
    },
    [fetchBatches],
  );

  const handleRetryFailed = useCallback(
    async (batchId: string) => {
      setRetryingBatchId(batchId);
      try {
        const res = await fetch(serviceUrl(`strategy-batch-runs/${batchId}/retry-failed`), {
          method: 'POST',
        });
        if (!res.ok) return;
        await fetchBatches();
      } catch {
        /* ignore */
      } finally {
        setRetryingBatchId(null);
      }
    },
    [fetchBatches],
  );

  const confirm = useConfirm();
  const handleDeleteBatch = useCallback(
    async (batchId: string, displayName: string) => {
      const ok = await confirm({
        title: `Delete "${displayName}"?`,
        description: 'This will permanently remove the batch and all its runs.',
        confirmLabel: 'Delete batch',
        tone: 'danger',
      });
      if (!ok) return;
      setDeletingBatchId(batchId);
      try {
        const res = await fetch(serviceUrl(`strategy-batch-runs/${batchId}`), { method: 'DELETE' });
        if (!res.ok) {
          toast.error('Failed to delete batch', {
            description: `Server responded with ${res.status}.`,
          });
          return;
        }
        setExpandedIds((prev) => {
          const next = new Set(prev);
          next.delete(batchId);
          return next;
        });
        toast.success(`Deleted batch "${displayName}"`);
        await fetchBatches();
      } catch (e) {
        toast.error('Failed to delete batch', {
          description: e instanceof Error ? e.message : undefined,
        });
      } finally {
        setDeletingBatchId(null);
      }
    },
    [fetchBatches, confirm],
  );

  const containerRef = useRef<HTMLDivElement | null>(null);
  const pendingScrollRef = useRef<number[] | null>(null);

  useLayoutEffect(() => {
    const saved = pendingScrollRef.current;
    if (!saved) return;
    pendingScrollRef.current = null;
    const scrollers = containerRef.current?.querySelectorAll<HTMLElement>('.overflow-x-auto');
    if (!scrollers) return;
    scrollers.forEach((el, i) => {
      if (i < saved.length) el.scrollLeft = saved[i];
    });
  });

  const fetchBatchesKeepScroll = useCallback(
    async (...args: Parameters<typeof fetchBatches>) => {
      const scrollers = containerRef.current?.querySelectorAll<HTMLElement>('.overflow-x-auto');
      pendingScrollRef.current = scrollers ? Array.from(scrollers).map((el) => el.scrollLeft) : [];
      await fetchBatches(...args);
    },
    [fetchBatches],
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="rounded-button bg-surface-sunken h-9 w-56 animate-pulse" />
          <div className="rounded-button bg-surface-sunken h-8 w-28 animate-pulse" />
        </div>
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="rounded-card border-border bg-surface shadow-card border">
            <div className="flex w-full items-center justify-between px-5 py-3">
              <div className="flex flex-1 items-center gap-3">
                <div className="bg-surface-sunken size-4 animate-pulse rounded" />
                <div className="rounded-pill bg-surface-sunken h-5 w-16 animate-pulse" />
                <div
                  className="bg-surface-sunken h-4 animate-pulse rounded"
                  style={{ width: 120 + (i % 3) * 40 }}
                />
                <div className="bg-surface-sunken h-4 w-20 animate-pulse rounded" />
                <div className="bg-surface-muted h-3 w-24 animate-pulse rounded" />
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <div className="bg-surface-sunken size-4 animate-pulse rounded" />
                <div className="bg-surface-muted h-3 w-28 animate-pulse rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="rounded-card border-warning-200 bg-warning-50 flex items-start gap-3 border p-4">
        <AlertTriangleIcon className="text-warning-600 mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-body text-warning-800">{fetchError}</p>
          <p className="text-caption text-warning-700 mt-1">
            Ensure BASE_API_HOSTNAME points to the image-generation backend.
          </p>
          <div className="mt-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setLoading(true);
                fetchBatches();
              }}
            >
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="space-y-4">
      {/* Date filter + view toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <DateRangePicker
          from={appliedFrom}
          to={appliedTo}
          onChange={handleDateChange}
          onClear={handleClearDate}
        />

        <SegmentedControl
          options={[
            { value: 'list', label: 'List' },
            { value: 'matrix', label: 'Matrix' },
          ]}
          value={viewMode}
          onChange={(v) => setViewMode(v)}
          size="sm"
          label="View mode"
        />
      </div>

      {refreshing && (
        <div className="text-body text-text-muted flex items-center gap-2">
          <Spinner size="sm" />
          Loading {source === 'benchmark' ? 'benchmark' : 'standard'} runs…
        </div>
      )}

      {batches.length === 0 && !loading && !refreshing ? (
        <p className="text-body text-text-secondary">
          {appliedFrom || appliedTo
            ? 'No runs match the selected date range.'
            : 'No runs yet. Use \u201cRun\u201d to create one.'}
        </p>
      ) : (
        <div
          className={`space-y-4 transition-opacity duration-200 ${refreshing ? 'pointer-events-none opacity-40' : 'opacity-100'}`}
        >
          {batches.map((batch) => {
            const isExpanded = expandedIds.has(batch.id);
            const isBenchmark = source === 'benchmark';
            const projectKeys = new Set(
              batch.runs.map((r) =>
                isBenchmark && r.batchRunId ? r.batchRunId : (r.inputPresetName ?? '(no preset)'),
              ),
            );
            const isMultiStrategy = batch.strategies.length > 1;

            return (
              <div
                key={batch.id}
                className="rounded-card border-border bg-surface shadow-card border"
              >
                <div className="flex w-full items-center justify-between px-5 py-3">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedIds((prev) => {
                        const next = new Set(prev);
                        if (isExpanded) next.delete(batch.id);
                        else next.add(batch.id);
                        return next;
                      })
                    }
                    className="hover:bg-surface-muted focus-visible:outline-primary-600 -my-1 -ml-2 flex flex-1 cursor-pointer items-center gap-3 rounded px-2 py-1 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  >
                    <ChevronRightIcon
                      className={cn(
                        'text-text-disabled size-4 transition-transform',
                        isExpanded && 'rotate-90',
                      )}
                      aria-hidden="true"
                    />
                    <ReviewStatusBadge status={batch.status} />
                    <span className="text-body text-text-primary font-semibold">
                      {batch.name ?? 'Untitled batch'}
                    </span>
                    {isMultiStrategy ? (
                      <MultiStrategyLabel strategies={batch.strategies} />
                    ) : batch.strategies.length === 1 ? (
                      <StrategyHoverCard strategyId={batch.strategies[0].id}>
                        <span className="text-caption text-text-muted cursor-help font-medium">
                          {batch.strategies[0].name}
                        </span>
                      </StrategyHoverCard>
                    ) : null}
                    <span className="text-body text-text-secondary">
                      {batch.totalRuns} run{batch.totalRuns === 1 ? '' : 's'} &middot;{' '}
                      {projectKeys.size} {isBenchmark ? 'project' : 'preset'}
                      {projectKeys.size === 1 ? '' : 's'}
                    </span>
                    <span className="text-caption text-text-muted">
                      {batch.completedRuns} completed
                      {batch.failedRuns > 0 ? `, ${batch.failedRuns} failed` : ''}
                    </span>
                  </button>
                  <div className="flex shrink-0 items-center gap-2">
                    {batch.failedRuns > 0 && (
                      <Button
                        variant="secondary"
                        size="sm"
                        loading={retryingBatchId === batch.id}
                        iconLeft={<RotateCcwIcon className="size-3.5" />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRetryFailed(batch.id);
                        }}
                        className="border-warning-300 bg-warning-50 text-warning-800 hover:bg-warning-100"
                      >
                        Retry failed ({batch.failedRuns})
                      </Button>
                    )}
                    <IconButton
                      label="Delete batch"
                      icon={<TrashIcon className="size-4" />}
                      variant="danger"
                      loading={deletingBatchId === batch.id}
                      onClick={() => handleDeleteBatch(batch.id, batch.name ?? 'Untitled batch')}
                    />
                    <span className="text-caption text-text-muted">
                      {new Date(batch.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-border-subtle border-t p-4">
                    {viewMode === 'matrix' ? (
                      <MatrixView
                        runs={batch.runs}
                        numberOfImages={batch.numberOfImages}
                        retryingRunId={retryingRunId}
                        onRetry={handleRetry}
                        onRated={fetchBatchesKeepScroll}
                        onImageClick={(run) =>
                          setLightbox({
                            src: run.lastOutputUrl!,
                            runHref: run.runHref ?? `/strategies/${run.strategyId}/runs/${run.id}`,
                            generationId: run.lastOutputGenerationId ?? null,
                          })
                        }
                        expanded={isExpanded}
                      />
                    ) : (
                      <ListView
                        runs={batch.runs}
                        numberOfImages={batch.numberOfImages}
                        isSingleStrategy={!isMultiStrategy}
                        retryingRunId={retryingRunId}
                        onRetry={handleRetry}
                        onRated={fetchBatchesKeepScroll}
                        onImageClick={(run) =>
                          setLightbox({
                            src: run.lastOutputUrl!,
                            runHref: run.runHref ?? `/strategies/${run.strategyId}/runs/${run.id}`,
                            generationId: run.lastOutputGenerationId ?? null,
                          })
                        }
                        expanded={isExpanded}
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {hasMore && (
            <div ref={sentinelRef}>
              {loadingMore ? (
                <div className="space-y-4 pt-1">
                  {Array.from({ length: 3 }, (_, i) => (
                    <div
                      key={i}
                      className="rounded-card border-border bg-surface shadow-card border"
                    >
                      <div className="flex w-full items-center justify-between px-5 py-3">
                        <div className="flex flex-1 items-center gap-3">
                          <div className="bg-surface-sunken size-4 animate-pulse rounded" />
                          <div className="rounded-pill bg-surface-sunken h-5 w-16 animate-pulse" />
                          <div
                            className="bg-surface-sunken h-4 animate-pulse rounded"
                            style={{ width: 120 + (i % 3) * 40 }}
                          />
                          <div className="bg-surface-sunken h-4 w-20 animate-pulse rounded" />
                        </div>
                        <div className="bg-surface-muted h-3 w-28 animate-pulse rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-4">&nbsp;</div>
              )}
            </div>
          )}
        </div>
      )}
      {lightbox && (
        <GridLightbox
          src={lightbox.src}
          runHref={lightbox.runHref}
          generationId={lightbox.generationId}
          onRated={() => fetchBatchesKeepScroll()}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  );
}

/* ─── Multi-strategy label with tooltip ─── */

function MultiStrategyLabel({ strategies }: { strategies: { id: string; name: string }[] }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  return (
    <span
      ref={ref}
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <Badge tone="accent" variant="soft" className="cursor-help">
        Multi-Strategy Run
      </Badge>
      {showTooltip && (
        <span className="rounded-card border-border bg-surface shadow-popover absolute top-full left-0 z-50 mt-1 w-56 border p-3">
          <span className="text-text-disabled mb-1.5 block text-[10px] font-medium tracking-wider uppercase">
            Strategies ({strategies.length})
          </span>
          {strategies.map((s) => (
            <span key={s.id} className="text-caption text-text-secondary block py-0.5">
              {s.name}
            </span>
          ))}
        </span>
      )}
    </span>
  );
}

/* ─── List view: strategy sections → preset rows × #N columns ─── */

function ListView({
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

/* ─── Matrix view: preset rows × strategy columns, first image only, click to expand ─── */

const JUDGE_TIMEOUT_MS = 5 * 60 * 1000;

function isAwaitingJudgeBatch(runs: RunRow[], numberOfImages: number): boolean {
  if (numberOfImages <= 1 || runs.length < 2) return false;
  const allDone = runs.every((r) => r.status === 'completed' || r.status === 'failed');
  if (!allDone) return false;
  const withOutput = runs.filter((r) => r.lastOutputUrl);
  if (withOutput.length < 2 || !runs.every((r) => r.judgeScore == null)) return false;

  const completedTimes = runs
    .filter((r) => r.completedAt)
    .map((r) => new Date(r.completedAt!).getTime());
  if (completedTimes.length === 0) return false;
  return Date.now() - Math.max(...completedTimes) < JUDGE_TIMEOUT_MS;
}

function MatrixView({
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
                              className="group relative block cursor-pointer"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={run.lastOutputUrl}
                                alt=""
                                loading="lazy"
                                className={`w-full rounded-md object-cover shadow-sm transition-shadow hover:shadow-md ${run.isJudgeSelected ? 'border-warning-400 ring-warning-200 border-2 ring-2' : 'border-border border'}`}
                                style={{ aspectRatio: '1' }}
                              />
                              <div className="absolute inset-0 flex items-center justify-center rounded-md bg-black/0 transition-colors group-hover:bg-black/20">
                                <svg
                                  className="size-5 text-white opacity-0 drop-shadow transition-opacity group-hover:opacity-100"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  strokeWidth={1.5}
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
                                  />
                                </svg>
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
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={firstRun.lastOutputUrl}
                              alt=""
                              loading="lazy"
                              className={`rounded-lg object-cover shadow-sm transition-shadow hover:shadow-md ${firstRun.isJudgeSelected ? 'border-warning-400 ring-warning-200 border-2 ring-2' : 'border-border border'}`}
                              style={{ width: CELL - 20, height: CELL - 20 }}
                            />
                            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/0 transition-colors group-hover:bg-black/20">
                              <svg
                                className="size-8 text-white opacity-0 drop-shadow transition-opacity group-hover:opacity-100"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={1.5}
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
                                />
                              </svg>
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
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={run.lastOutputUrl}
                alt=""
                loading="lazy"
                className={`rounded-lg object-cover shadow-sm transition-shadow hover:shadow-md ${run.isJudgeSelected ? 'border-warning-400 ring-warning-200 border-2 ring-2' : 'border-border border'}`}
                style={{ width: cellSize - 20, height: cellSize - 20 }}
              />
              <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/0 transition-colors group-hover:bg-black/20">
                <svg
                  className="size-8 text-white opacity-0 drop-shadow transition-opacity group-hover:opacity-100"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
                  />
                </svg>
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

function ReviewStatusBadge({ status }: { status: string }) {
  const config: Record<
    string,
    { tone: 'info' | 'neutral' | 'warning' | 'success'; label: string }
  > = {
    running: { tone: 'info', label: 'Running' },
    pending: { tone: 'neutral', label: 'Pending' },
    in_progress: { tone: 'warning', label: 'In Progress' },
    reviewed: { tone: 'success', label: 'Reviewed' },
  };
  const c = config[status] ?? config.pending;
  return (
    <Badge tone={c.tone} variant="soft">
      {c.label}
    </Badge>
  );
}
