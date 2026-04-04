'use client';

import { DateRangePicker } from '@/components/date-range-picker';
import { GridLightbox } from '@/components/grid-lightbox';
import { JudgeScoreBadge } from '@/components/judge-score-badge';
import { MatrixCellRatingOverlay } from '@/components/matrix-cell-rating-overlay';
import { StrategyHoverCard } from '@/components/strategy-hover-card';
import { serviceUrl } from '@/lib/api-base';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

interface RunRow {
  id: string;
  strategyId: string;
  strategyName: string | null;
  status: string;
  createdAt: string;
  completedAt: string | null;
  inputPresetName: string | null;
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
    inputPresetName:
      r.inputPresetName ??
      (r.inputPresets as { inputPresetName?: string }[] | undefined)?.[0]?.inputPresetName ??
      null,
  }));
  return { ...b, runs } as BatchRow;
}

export function BatchRunsTab({ refreshKey }: { refreshKey?: number }) {
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
  const [markingBatchId, setMarkingBatchId] = useState<string | null>(null);
  const [deletingBatchId, setDeletingBatchId] = useState<string | null>(null);
  const [retryingJudgeBatchId, setRetryingJudgeBatchId] = useState<string | null>(null);
  const [judgeRetryError, setJudgeRetryError] = useState<{ batchId: string; message: string } | null>(null);
  const [lightbox, setLightbox] = useState<{ src: string; runHref: string; generationId: string | null } | null>(null);
  const [appliedFrom, setAppliedFrom] = useState('');
  const [appliedTo, setAppliedTo] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  /** Prior page-1 id set; merge uses it to prune likely deletes when the refreshed page 1 has no new batch ids. */
  const lastFetchedFirstPageIdsRef = useRef<Set<string>>(new Set());

  const fetchBatches = useCallback(async (opts: { replace?: boolean; pageToFetch?: number; mergeFirstPage?: boolean } = {}) => {
    const mergeFirstPage = opts.mergeFirstPage === true;
    const replace = mergeFirstPage ? false : (opts.replace ?? true);
    const pageToFetch = mergeFirstPage ? 1 : (opts.pageToFetch ?? 1);
    const limit = BATCH_PAGE_SIZE;
    if (replace && !mergeFirstPage) setFetchError(null);
    else if (!replace && !mergeFirstPage) setLoadingMore(true);
    try {
      const params = new URLSearchParams({ page: String(pageToFetch), limit: String(limit) });
      if (appliedFrom) params.set('from', appliedFrom);
      if (appliedTo) params.set('to', appliedTo);
      const res = await fetch(serviceUrl(`strategy-batch-runs?${params}`), { cache: 'no-store' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = (err as { error?: { message?: string } })?.error?.message;
        setFetchError(msg || `Failed to load (${res.status}). Check that the backend is reachable.`);
        if (!mergeFirstPage) setHasMore(false);
        return;
      }
      const json = await res.json();
      const raw = (json.data ?? []) as Record<string, unknown>[];
      const normalized = raw.map((b) => normalizeBatch(b));
      if (mergeFirstPage) {
        setFetchError(null);
        // Poll merge only refreshes page 1; rows already loaded from page 2+ are reused as-is.
        // Known gap: tail batch status can stay stale (and shouldPoll may stay true) until a
        // full replace or refetch. Refreshing all loaded pages each interval would fix it but
        // multiplies requests by the number of pages the user has scrolled into.
        // We do not reset `page` here (would thrash during polling); the append path dedupes by
        // batch id so loadMore after top-of-list insertions does not duplicate tail rows.
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
        // Initial fetch: keep paging while the page is non-empty. The batch-runs list often
        // returns fewer than `limit` rows even when more pages exist, so we cannot treat a
        // short page as the end. We may send one extra request that returns an empty page.
        // Prefer explicit hasNext/total from the API when available.
        setBatches(normalized);
        setPage(1);
        setHasMore(raw.length > 0);
        lastFetchedFirstPageIdsRef.current = new Set(normalized.map((b) => b.id));
      } else {
        let appendedNew = 0;
        setBatches((prev) => {
          const existingIds = new Set(prev.map((b) => b.id));
          const added = normalized.filter((b) => !existingIds.has(b.id));
          appendedNew = added.length;
          return [...prev, ...added];
        });
        setPage(pageToFetch);
        setHasMore(raw.length > 0 && appendedNew > 0);
      }
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : 'Network error. Check backend and try again.');
      if (!mergeFirstPage) setHasMore(false);
    }
    finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [appliedFrom, appliedTo]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    fetchBatches({ replace: false, pageToFetch: page + 1 });
  }, [hasMore, loadingMore, page, fetchBatches]);

  useEffect(() => {
    fetchBatches({ replace: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedFrom, appliedTo, refreshKey]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore || loadingMore) return;
    const obs = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting) loadMore(); },
      { rootMargin: '200px', threshold: 0 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, loadingMore, loadMore]);

  const hasActive = batches.some((b) => b.status === 'running');
  const hasAwaitingJudge = batches.some((b) => isAwaitingJudgeBatch(b.runs, b.numberOfImages));
  const shouldPoll = hasActive || hasAwaitingJudge;
  useEffect(() => {
    if (shouldPoll) {
      intervalRef.current = setInterval(() => fetchBatches({ mergeFirstPage: true }), POLL_INTERVAL);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [shouldPoll, fetchBatches]);

  const handleDateChange = useCallback((from: string, to: string) => {
    setAppliedFrom(from);
    setAppliedTo(to);
  }, []);

  const handleClearDate = useCallback(() => {
    setAppliedFrom('');
    setAppliedTo('');
  }, []);

  const handleRetry = useCallback(async (runId: string) => {
    setRetryingRunId(runId);
    try {
      const res = await fetch(serviceUrl(`strategy-runs/${runId}/retry`), { method: 'POST' });
      if (!res.ok) return;
      await fetchBatches();
    } catch { /* ignore */ }
    finally { setRetryingRunId(null); }
  }, [fetchBatches]);

  const handleRetryFailed = useCallback(async (batchId: string) => {
    setRetryingBatchId(batchId);
    try {
      const res = await fetch(serviceUrl(`strategy-batch-runs/${batchId}/retry-failed`), { method: 'POST' });
      if (!res.ok) return;
      await fetchBatches();
    } catch { /* ignore */ }
    finally { setRetryingBatchId(null); }
  }, [fetchBatches]);

  const handleMarkBatchFailed = useCallback(async (batchId: string) => {
    setMarkingBatchId(batchId);
    try {
      const res = await fetch(serviceUrl(`strategy-batch-runs/${batchId}/mark-failed`), { method: 'POST' });
      if (!res.ok) return;
      await fetchBatches();
    } catch { /* ignore */ }
    finally { setMarkingBatchId(null); }
  }, [fetchBatches]);

  const handleDeleteBatch = useCallback(async (batchId: string, displayName: string) => {
    if (!confirm(`Delete "${displayName}"? This will permanently remove the batch and all its runs.`)) return;
    setDeletingBatchId(batchId);
    try {
      const res = await fetch(serviceUrl(`strategy-batch-runs/${batchId}`), { method: 'DELETE' });
      if (!res.ok) return;
      setExpandedIds((prev) => { const next = new Set(prev); next.delete(batchId); return next; });
      await fetchBatches();
    } catch { /* ignore */ }
    finally { setDeletingBatchId(null); }
  }, [fetchBatches]);

  const handleRetryJudge = useCallback(async (batchId: string) => {
    setRetryingJudgeBatchId(batchId);
    setJudgeRetryError(null);
    try {
      const res = await fetch(serviceUrl(`strategy-batch-runs/${batchId}/retry-judge`), { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const msg = (body as { error?: { message?: string } })?.error?.message ?? `Retry failed (${res.status})`;
        setJudgeRetryError({ batchId, message: msg });
      } else {
        const body = await res.json().catch(() => null);
        const data = (body as { data?: { failedGroups?: number; errors?: string[] } })?.data;
        if (data?.failedGroups && data.failedGroups > 0) {
          setJudgeRetryError({ batchId, message: data.errors?.[0] ?? 'Judge failed during retry' });
        }
      }
      await fetchBatches();
    } catch (err) {
      setJudgeRetryError({ batchId, message: err instanceof Error ? err.message : 'Network error' });
      await fetchBatches().catch(() => {});
    }
    finally { setRetryingJudgeBatchId(null); }
  }, [fetchBatches]);

  if (loading) return <p className="text-sm text-gray-500">Loading runs…</p>;

  if (fetchError) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm text-amber-800">{fetchError}</p>
        <p className="mt-1 text-xs text-amber-700">Ensure BASE_API_HOSTNAME points to the image-generation backend.</p>
        <button
          type="button"
          onClick={() => { setLoading(true); fetchBatches(); }}
          className="mt-3 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium text-amber-800 shadow-sm hover:bg-amber-100"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Date filter + view toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <DateRangePicker
          from={appliedFrom}
          to={appliedTo}
          onChange={handleDateChange}
          onClear={handleClearDate}
        />

        <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${viewMode === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
          >
            List
          </button>
          <button
            type="button"
            onClick={() => setViewMode('matrix')}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${viewMode === 'matrix' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Matrix
          </button>
        </div>
      </div>

      {batches.length === 0 && !loading ? (
        <p className="text-sm text-gray-600">
          {appliedFrom || appliedTo
            ? 'No runs match the selected date range.'
            : 'No runs yet. Use \u201cRun\u201d to create one.'}
        </p>
      ) : (
        <div className="space-y-4">
        {batches.map((batch) => {
          const isExpanded = expandedIds.has(batch.id);
          const presetNames = new Set(batch.runs.map((r) => r.inputPresetName ?? '(no preset)'));
          const isMultiStrategy = batch.strategies.length > 1;

          return (
            <div key={batch.id} className="rounded-lg border border-gray-200 bg-white shadow-xs">
              <div className="flex w-full items-center justify-between px-5 py-3">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setExpandedIds((prev) => { const next = new Set(prev); if (isExpanded) next.delete(batch.id); else next.add(batch.id); return next; })}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedIds((prev) => { const next = new Set(prev); if (isExpanded) next.delete(batch.id); else next.add(batch.id); return next; }); } }}
                  className="flex flex-1 items-center gap-3 text-left hover:bg-gray-50 rounded -ml-2 -my-1 px-2 py-1 cursor-pointer"
                >
                  <svg
                    className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                    fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                  <ReviewStatusBadge status={batch.status} />
                  <span className="text-sm font-semibold text-gray-900">
                    {batch.name ?? 'Untitled batch'}
                  </span>
                  {isMultiStrategy ? (
                    <MultiStrategyLabel strategies={batch.strategies} />
                  ) : batch.strategies.length === 1 ? (
                    <StrategyHoverCard strategyId={batch.strategies[0].id}>
                      <span className="text-xs font-medium text-gray-500 cursor-help">
                        {batch.strategies[0].name}
                      </span>
                    </StrategyHoverCard>
                  ) : null}
                  <span className="text-sm text-gray-600">
                    {batch.totalRuns} run{batch.totalRuns === 1 ? '' : 's'} &middot;{' '}
                    {presetNames.size} preset{presetNames.size === 1 ? '' : 's'}
                  </span>
                  <span className="text-xs text-gray-400">
                    {batch.completedRuns} completed{batch.failedRuns > 0 ? `, ${batch.failedRuns} failed` : ''}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {batch.failedRuns > 0 && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleRetryFailed(batch.id); }}
                      disabled={retryingBatchId === batch.id}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100 disabled:opacity-50"
                    >
                      {retryingBatchId === batch.id ? (
                        <>
                          <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Retrying…
                        </>
                      ) : (
                        <>Retry failed ({batch.failedRuns})</>
                      )}
                    </button>
                  )}
                  {needsJudgeRetry(batch.runs) && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleRetryJudge(batch.id); }}
                      disabled={retryingJudgeBatchId === batch.id}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-100 disabled:opacity-50"
                    >
                      {retryingJudgeBatchId === batch.id ? (
                        <>
                          <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Retrying…
                        </>
                      ) : (
                        <>Retry Judge</>
                      )}
                    </button>
                  )}
                  {batch.status !== 'reviewed' && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleMarkBatchFailed(batch.id); }}
                      disabled={markingBatchId === batch.id}
                      className="rounded border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                    >
                      {markingBatchId === batch.id ? '…' : 'Mark batch as failed'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDeleteBatch(batch.id, batch.name ?? 'Untitled batch')}
                    disabled={deletingBatchId === batch.id}
                    className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                    title="Delete run"
                  >
                    {deletingBatchId === batch.id ? (
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    )}
                  </button>
                  <span className="text-xs text-gray-400">
                    {new Date(batch.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>

              {judgeRetryError?.batchId === batch.id && (
                <div className="flex items-center justify-between border-t border-red-100 bg-red-50 px-4 py-2">
                  <span className="text-xs text-red-700">{judgeRetryError.message}</span>
                  <button type="button" onClick={() => setJudgeRetryError(null)} className="text-xs text-red-400 hover:text-red-600">dismiss</button>
                </div>
              )}

              {isExpanded && (
                <div className="border-t border-gray-100 p-4">
                  {viewMode === 'matrix' ? (
                    <MatrixView
                      runs={batch.runs}
                      retryingRunId={retryingRunId}
                      onRetry={handleRetry}
                      onRated={fetchBatches}
                      onImageClick={(run) => setLightbox({ src: run.lastOutputUrl!, runHref: `/strategies/${run.strategyId}/runs/${run.id}`, generationId: run.lastOutputGenerationId ?? null })}
                    />
                  ) : (
                    <ListView
                      runs={batch.runs}
                      numberOfImages={batch.numberOfImages}
                      isSingleStrategy={!isMultiStrategy}
                      retryingRunId={retryingRunId}
                      onRetry={handleRetry}
                      onRated={fetchBatches}
                      onImageClick={(run) => setLightbox({ src: run.lastOutputUrl!, runHref: `/strategies/${run.strategyId}/runs/${run.id}`, generationId: run.lastOutputGenerationId ?? null })}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })
      }
      {hasMore && (
        <div ref={sentinelRef} className="py-4 text-center text-sm text-gray-500">
          {loadingMore ? 'Loading more…' : '\u00a0'}
        </div>
      )}
        </div>
      )}
      {lightbox && (
        <GridLightbox
          src={lightbox.src}
          runHref={lightbox.runHref}
          generationId={lightbox.generationId}
          onRated={() => fetchBatches()}
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
      <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700 ring-1 ring-purple-200 cursor-help">
        Multi-Strategy Run
      </span>
      {showTooltip && (
        <span className="absolute left-0 top-full z-50 mt-1 w-56 rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
          <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-gray-400">
            Strategies ({strategies.length})
          </span>
          {strategies.map((s) => (
            <span key={s.id} className="block text-xs text-gray-700 py-0.5">
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
}: {
  runs: RunRow[];
  numberOfImages: number;
  isSingleStrategy?: boolean;
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
  for (const run of runs) {
    if (!grouped.has(run.strategyId)) grouped.set(run.strategyId, new Map());
    const byPreset = grouped.get(run.strategyId)!;
    const preset = run.inputPresetName ?? '(no preset)';
    if (!byPreset.has(preset)) byPreset.set(preset, []);
    byPreset.get(preset)!.push(run);
  }
  for (const byPreset of grouped.values()) {
    for (const arr of byPreset.values()) {
      arr.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }
  }

  const CELL = 240;

  return (
    <div className="space-y-6">
      {strategyOrder.map((stratId) => {
        const byPreset = grouped.get(stratId)!;
        const presetNames = Array.from(byPreset.keys()).sort();
        const maxExec = Math.max(0, ...Array.from(byPreset.values()).map((a) => a.length));

        return (
          <div key={stratId}>
            {!isSingleStrategy && (
              <h3 className="mb-2 text-sm font-semibold text-gray-800">
                <StrategyHoverCard strategyId={stratId}>
                  <Link href={`/strategies/${stratId}`} className="text-primary-600 hover:text-primary-500">
                    {strategyLabels.get(stratId)}
                  </Link>
                </StrategyHoverCard>
              </h3>
            )}
            <div className="overflow-x-auto overflow-y-hidden rounded-lg border border-gray-200">
              <table className="divide-y divide-gray-200" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      className="sticky left-0 z-20 border-r border-gray-200 bg-gray-50 px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-600"
                      style={{ minWidth: 200, maxWidth: 200 }}
                    >
                      Input preset
                    </th>
                    {Array.from({ length: maxExec }, (_, i) => (
                      <th key={i} className="px-2 py-2.5 text-center text-xs font-medium uppercase tracking-wider text-gray-600"
                        style={{ width: CELL, minWidth: CELL }}>
                        #{i + 1}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {presetNames.map((presetName) => {
                    const presetRuns = byPreset.get(presetName)!;
                    return (
                      <tr key={presetName} className="hover:bg-gray-50/50">
                        <td className="sticky left-0 z-20 border-r border-gray-200 bg-white px-4 text-sm font-medium text-gray-900"
                          style={{ minWidth: 200, maxWidth: 200 }}>
                          <span className="block break-words">{presetName}</span>
                        </td>
                        {Array.from({ length: maxExec }, (_, i) => (
                          <RunCell key={i} run={presetRuns[i]} cellSize={CELL} awaitingJudge={awaitingJudge} retryingRunId={retryingRunId} onRetry={onRetry} onRated={onRated} onImageClick={onImageClick} />
                        ))}
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

  const completedTimes = runs.filter((r) => r.completedAt).map((r) => new Date(r.completedAt!).getTime());
  if (completedTimes.length === 0) return false;
  return Date.now() - Math.max(...completedTimes) < JUDGE_TIMEOUT_MS;
}

function needsJudgeRetry(runs: RunRow[]): boolean {
  const completed = runs.filter((r) => r.status === 'completed' && r.lastOutputUrl);
  if (completed.length < 2) return false;
  return completed.some((r) => r.judgeScore === 0) ||
    completed.every((r) => r.judgeScore == null);
}

function MatrixView({
  runs,
  retryingRunId,
  onRetry,
  onRated,
  onImageClick,
}: {
  runs: RunRow[];
  retryingRunId: string | null;
  onRetry: (runId: string) => void;
  onRated?: () => void;
  onImageClick: (run: RunRow) => void;
}) {
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

  const presetNames = new Set<string>();
  for (const run of runs) presetNames.add(run.inputPresetName ?? '(no preset)');
  const sortedPresets = Array.from(presetNames).sort();

  const grid = new Map<string, RunRow[]>();
  for (const run of runs) {
    const presetName = run.inputPresetName ?? '(no preset)';
    const key = `${presetName}\0${run.strategyId}`;
    if (!grid.has(key)) grid.set(key, []);
    grid.get(key)!.push(run);
  }
  for (const arr of grid.values()) {
    arr.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  const CELL = 240;

  return (
    <div className="overflow-x-auto overflow-y-hidden rounded-lg border border-gray-200">
      <table className="divide-y divide-gray-200" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
        <thead className="bg-gray-50">
          <tr>
            <th
              className="sticky left-0 z-20 border-r border-gray-200 bg-gray-50 px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-600"
              style={{ minWidth: 200, maxWidth: 200 }}
            >
              Input preset
            </th>
            {strategyNames.map((name, i) => (
              <th key={strategyIds[i]} className="px-2 py-2.5 text-center text-xs font-medium tracking-wider text-gray-600"
                style={{ minWidth: CELL }}>
                <StrategyHoverCard strategyId={strategyIds[i]}>
                  <Link href={`/strategies/${strategyIds[i]}`} className="text-primary-600 hover:text-primary-500">
                    {name}
                  </Link>
                </StrategyHoverCard>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {sortedPresets.map((presetName) => (
            <tr key={presetName} className="hover:bg-gray-50/50">
              <td className="sticky left-0 z-20 border-r border-gray-200 bg-white px-4 text-sm font-medium text-gray-900"
                style={{ minWidth: 200, maxWidth: 200 }}>
                <span className="block break-words">{presetName}</span>
              </td>
              {strategyIds.map((stratId) => {
                const cellRuns = grid.get(`${presetName}\0${stratId}`) ?? [];
                const firstRun = cellRuns[0];
                const outputRuns = cellRuns.filter(
                  (run): run is RunRow & { lastOutputUrl: string } => !!run.lastOutputUrl
                );
                return (
                  <td key={stratId} className="border-l border-gray-100 p-1.5 text-center align-middle"
                    style={{ width: CELL, height: CELL, minWidth: CELL }}>
                    <div className="flex h-full w-full flex-col items-center justify-center gap-1">
                      {!firstRun ? (
                        <span className="text-gray-200">&mdash;</span>
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
                              <img src={run.lastOutputUrl} alt=""
                                className="w-full rounded-md border border-gray-200 object-cover shadow-sm transition-shadow hover:shadow-md"
                                style={{ aspectRatio: '1' }} />
                              <div className="absolute inset-0 flex items-center justify-center rounded-md bg-black/0 transition-colors group-hover:bg-black/20">
                                <svg className="h-5 w-5 text-white opacity-0 drop-shadow transition-opacity group-hover:opacity-100" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                                </svg>
                              </div>
                              {run.lastOutputGenerationId && (
                                <MatrixCellRatingOverlay generationId={run.lastOutputGenerationId} onRated={onRated} />
                              )}
                            </button>
                          ))}
                        </div>
                      ) : firstRun.lastOutputUrl ? (
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => onImageClick(firstRun)}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onImageClick(firstRun); }}
                          className="group relative block cursor-pointer"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={firstRun.lastOutputUrl} alt=""
                            className="rounded-lg border border-gray-200 object-cover shadow-sm transition-shadow hover:shadow-md"
                            style={{ width: CELL - 20, height: CELL - 20 }} />
                          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/0 transition-colors group-hover:bg-black/20">
                            <svg className="h-8 w-8 text-white opacity-0 drop-shadow transition-opacity group-hover:opacity-100" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                            </svg>
                          </div>
                          {firstRun.lastOutputGenerationId && (
                            <MatrixCellRatingOverlay generationId={firstRun.lastOutputGenerationId} onRated={onRated} />
                          )}
                        </div>
                      ) : (
                        <>
                          <Link href={`/strategies/${firstRun.strategyId}/runs/${firstRun.id}`}>
                            <ReviewStatusBadge status={deriveRunReviewStatus(firstRun)} />
                          </Link>
                          {(firstRun.status === 'failed' || firstRun.status === 'skipped') && (
                            <button type="button" onClick={() => onRetry(firstRun.id)}
                              disabled={retryingRunId === firstRun.id}
                              className="text-xs font-medium text-amber-600 hover:text-amber-500 disabled:opacity-50">
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

/* ─── Shared cell renderer ─── */

function RunCell({
  run,
  cellSize,
  awaitingJudge,
  retryingRunId,
  onRetry,
  onRated,
  onImageClick,
}: {
  run: RunRow | undefined;
  cellSize: number;
  awaitingJudge?: boolean;
  retryingRunId: string | null;
  onRetry: (runId: string) => void;
  onRated?: () => void;
  onImageClick: (run: RunRow) => void;
}) {
  return (
    <td className="border-l border-gray-100 p-1.5 text-center align-middle"
      style={{ width: cellSize, height: cellSize, minWidth: cellSize }}>
      <div className="flex h-full w-full flex-col items-center justify-center gap-1">
        {!run ? (
          <span className="text-gray-200">&mdash;</span>
        ) : run.lastOutputUrl ? (
          <div
            role="button"
            tabIndex={0}
            onClick={() => onImageClick(run)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onImageClick(run); }}
            className="group relative block cursor-pointer"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={run.lastOutputUrl} alt=""
              className={`rounded-lg object-cover shadow-sm transition-shadow hover:shadow-md ${run.isJudgeSelected ? 'border-2 border-amber-400 ring-2 ring-amber-200' : 'border border-gray-200'}`}
              style={{ width: cellSize - 20, height: cellSize - 20 }} />
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/0 transition-colors group-hover:bg-black/20">
              <svg className="h-8 w-8 text-white opacity-0 drop-shadow transition-opacity group-hover:opacity-100" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
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
            {run.lastOutputGenerationId && (
              <MatrixCellRatingOverlay generationId={run.lastOutputGenerationId} onRated={onRated} />
            )}
          </div>
        ) : (
          <>
            <Link href={`/strategies/${run.strategyId}/runs/${run.id}`}>
              <ReviewStatusBadge status={deriveRunReviewStatus(run)} />
            </Link>
            {(run.status === 'failed' || run.status === 'skipped') && (
              <button type="button" onClick={() => onRetry(run.id)}
                disabled={retryingRunId === run.id}
                className="text-xs font-medium text-amber-600 hover:text-amber-500 disabled:opacity-50">
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
  const config: Record<string, { style: string; label: string }> = {
    running: { style: 'bg-blue-100 text-blue-700', label: 'Running' },
    pending: { style: 'bg-gray-100 text-gray-700', label: 'Pending' },
    in_progress: { style: 'bg-amber-100 text-amber-700', label: 'In Progress' },
    reviewed: { style: 'bg-green-100 text-green-700', label: 'Reviewed' },
  };
  const c = config[status] ?? config.pending;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${c.style}`}>
      {c.label}
    </span>
  );
}
