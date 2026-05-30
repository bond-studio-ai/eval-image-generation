'use client';

import { GridLightbox } from '@/components/grid-lightbox';
import { Spinner, toast, useConfirm } from '@/components/ui';
import { serviceUrl } from '@/lib/api-base';
import { useCallback, useReducer, useRef, useState } from 'react';
import { BatchErrorCard } from './_components/batch-error-card';
import { BatchList } from './_components/batch-list';
import { BatchLoadingSkeleton } from './_components/batch-loading-skeleton';
import { BatchToolbar } from './_components/batch-toolbar';
import { type BatchRow, type FetchState, type RunRow } from './_components/batch-types';
import { useBatchListMachinery } from './_components/use-batch-list-machinery';

const BATCH_PAGE_SIZE = 20;

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

type FetchAction =
  | { type: 'replaceStart'; setRefreshing: boolean }
  | { type: 'loadMoreStart' }
  | { type: 'fetchErrorResponse'; error: string; clearHasMore: boolean }
  | { type: 'mergeFirstPage'; normalized: BatchRow[]; priorFirstPageIds: Set<string> }
  | { type: 'replaceSuccess'; normalized: BatchRow[]; hasMore: boolean }
  | { type: 'appendSuccess'; normalized: BatchRow[]; page: number; hasMore: boolean }
  | { type: 'fetchSettled' }
  | { type: 'setLoading'; loading: boolean };

const initialFetchState: FetchState = {
  batches: [],
  page: 1,
  hasMore: false,
  loading: true,
  loadingMore: false,
  fetchError: null,
  refreshing: false,
};

function fetchReducer(state: FetchState, action: FetchAction): FetchState {
  switch (action.type) {
    case 'replaceStart':
      // setFetchError(null), and setRefreshing(true) only when caller was not loading.
      return {
        ...state,
        fetchError: null,
        refreshing: action.setRefreshing ? true : state.refreshing,
      };
    case 'loadMoreStart':
      return { ...state, loadingMore: true };
    case 'fetchErrorResponse':
      return {
        ...state,
        fetchError: action.error,
        hasMore: action.clearHasMore ? false : state.hasMore,
      };
    case 'mergeFirstPage': {
      const { normalized, priorFirstPageIds } = action;
      const topIds = new Set(normalized.map((b) => b.id));
      const prevIds = new Set(state.batches.map((b) => b.id));
      const mergeIncludesNewBatchId = normalized.some((b) => !prevIds.has(b.id));
      const tail = state.batches.filter((b) => {
        if (topIds.has(b.id)) return false;
        if (priorFirstPageIds.has(b.id) && !mergeIncludesNewBatchId) return false;
        return true;
      });
      return {
        ...state,
        fetchError: null,
        batches: [...normalized, ...tail],
        hasMore: mergeIncludesNewBatchId ? true : state.hasMore,
      };
    }
    case 'replaceSuccess':
      return { ...state, batches: action.normalized, page: 1, hasMore: action.hasMore };
    case 'appendSuccess': {
      const existingIds = new Set(state.batches.map((b) => b.id));
      const added = action.normalized.filter((b) => !existingIds.has(b.id));
      return {
        ...state,
        batches: [...state.batches, ...added],
        page: action.page,
        hasMore: action.hasMore,
      };
    }
    case 'fetchSettled':
      return { ...state, loading: false, loadingMore: false, refreshing: false };
    case 'setLoading':
      return { ...state, loading: action.loading };
  }
}

/** Row-action-in-flight ids (retry run / retry batch / delete batch). */
interface PendingState {
  retryingRunId: string | null;
  retryingBatchId: string | null;
  deletingBatchId: string | null;
}

type PendingAction =
  | { type: 'retryingRun'; id: string | null }
  | { type: 'retryingBatch'; id: string | null }
  | { type: 'deletingBatch'; id: string | null };

const initialPendingState: PendingState = {
  retryingRunId: null,
  retryingBatchId: null,
  deletingBatchId: null,
};

function pendingReducer(state: PendingState, action: PendingAction): PendingState {
  switch (action.type) {
    case 'retryingRun':
      return { ...state, retryingRunId: action.id };
    case 'retryingBatch':
      return { ...state, retryingBatchId: action.id };
    case 'deletingBatch':
      return { ...state, deletingBatchId: action.id };
  }
}

/** Applied date-range filter (from/to), always set together. */
interface AppliedRangeState {
  from: string;
  to: string;
}

type AppliedRangeAction = { type: 'set'; from: string; to: string };

const initialAppliedRangeState: AppliedRangeState = { from: '', to: '' };

function appliedRangeReducer(
  state: AppliedRangeState,
  action: AppliedRangeAction,
): AppliedRangeState {
  switch (action.type) {
    case 'set':
      return { from: action.from, to: action.to };
  }
}

export function BatchRunsTab({
  refreshKey,
  source = 'default',
}: {
  refreshKey?: number;
  source?: 'default' | 'benchmark';
}) {
  const [fetchState, fetchDispatch] = useReducer(fetchReducer, initialFetchState);
  const [pending, pendingDispatch] = useReducer(pendingReducer, initialPendingState);
  const [appliedRange, appliedRangeDispatch] = useReducer(
    appliedRangeReducer,
    initialAppliedRangeState,
  );
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'list' | 'matrix'>('list');
  const [lightbox, setLightbox] = useState<{
    src: string;
    runHref: string;
    generationId: string | null;
  } | null>(null);
  /** Prior page-1 id set; merge uses it to prune likely deletes when the refreshed page 1 has no new batch ids. */
  const lastFetchedFirstPageIdsRef = useRef<Set<string>>(new Set());

  const fetchBatches = useCallback(
    async (opts: { replace?: boolean; pageToFetch?: number; mergeFirstPage?: boolean } = {}) => {
      const mergeFirstPage = opts.mergeFirstPage === true;
      const replace = mergeFirstPage ? false : (opts.replace ?? true);
      const pageToFetch = mergeFirstPage ? 1 : (opts.pageToFetch ?? 1);
      const limit = BATCH_PAGE_SIZE;
      if (replace && !mergeFirstPage) {
        fetchDispatch({ type: 'replaceStart', setRefreshing: !fetchState.loading });
        if (!fetchState.loading) {
          setExpandedIds(new Set());
        }
      } else if (!replace && !mergeFirstPage) {
        fetchDispatch({ type: 'loadMoreStart' });
      }
      try {
        const params = new URLSearchParams({ page: String(pageToFetch), limit: String(limit) });
        if (appliedRange.from) params.set('from', appliedRange.from);
        if (appliedRange.to) params.set('to', appliedRange.to);
        if (source === 'benchmark') params.set('source', 'benchmark');
        const res = await fetch(serviceUrl(`strategy-batch-runs?${params}`), { cache: 'no-store' });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          const msg = (err as { error?: { message?: string } })?.error?.message;
          fetchDispatch({
            type: 'fetchErrorResponse',
            error: msg || `Failed to load (${res.status}). Check that the backend is reachable.`,
            clearHasMore: !mergeFirstPage,
          });
          return;
        }
        const json = await res.json();
        const raw = (json.data ?? []) as Record<string, unknown>[];
        const apiHasMore = json.hasMore === true;
        const normalized = raw.map((b) => normalizeBatch(b));
        if (mergeFirstPage) {
          const priorFirstPageIds = lastFetchedFirstPageIdsRef.current;
          fetchDispatch({ type: 'mergeFirstPage', normalized, priorFirstPageIds });
          lastFetchedFirstPageIdsRef.current = new Set(normalized.map((b) => b.id));
        } else if (replace) {
          fetchDispatch({ type: 'replaceSuccess', normalized, hasMore: apiHasMore });
          lastFetchedFirstPageIdsRef.current = new Set(normalized.map((b) => b.id));
        } else {
          fetchDispatch({
            type: 'appendSuccess',
            normalized,
            page: pageToFetch,
            hasMore: apiHasMore,
          });
        }
      } catch (e) {
        fetchDispatch({
          type: 'fetchErrorResponse',
          error: e instanceof Error ? e.message : 'Network error. Check backend and try again.',
          clearHasMore: !mergeFirstPage,
        });
      } finally {
        fetchDispatch({ type: 'fetchSettled' });
      }
    },
    // `fetchState.loading` is intentionally read stale (omitted from deps), matching the
    // pre-reducer behavior where `loading` was captured at callback creation: replace-refetches
    // triggered by retry/delete must not flip on the refreshing overlay or collapse expanded rows.
    [appliedRange.from, appliedRange.to, source],
  );

  const { sentinelRef, containerRef, fetchBatchesKeepScroll } = useBatchListMachinery({
    fetchState,
    fetchBatches,
    from: appliedRange.from,
    to: appliedRange.to,
    source,
    refreshKey,
  });

  const handleDateChange = useCallback((from: string, to: string) => {
    appliedRangeDispatch({ type: 'set', from, to });
  }, []);

  const handleClearDate = useCallback(() => {
    appliedRangeDispatch({ type: 'set', from: '', to: '' });
  }, []);

  const handleRetry = useCallback(
    async (runId: string) => {
      pendingDispatch({ type: 'retryingRun', id: runId });
      try {
        const res = await fetch(serviceUrl(`strategy-runs/${runId}/retry`), { method: 'POST' });
        if (!res.ok) return;
        await fetchBatches();
      } catch {
        /* ignore */
      } finally {
        pendingDispatch({ type: 'retryingRun', id: null });
      }
    },
    [fetchBatches],
  );

  const handleRetryFailed = useCallback(
    async (batchId: string) => {
      pendingDispatch({ type: 'retryingBatch', id: batchId });
      try {
        const res = await fetch(serviceUrl(`strategy-batch-runs/${batchId}/retry-failed`), {
          method: 'POST',
        });
        if (!res.ok) return;
        await fetchBatches();
      } catch {
        /* ignore */
      } finally {
        pendingDispatch({ type: 'retryingBatch', id: null });
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
      pendingDispatch({ type: 'deletingBatch', id: batchId });
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
        pendingDispatch({ type: 'deletingBatch', id: null });
      }
    },
    [fetchBatches, confirm],
  );

  const handleToggle = useCallback((batchId: string, isExpanded: boolean) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (isExpanded) next.delete(batchId);
      else next.add(batchId);
      return next;
    });
  }, []);

  const handleImageClick = useCallback((run: RunRow) => {
    setLightbox({
      src: run.lastOutputUrl!,
      runHref: run.runHref ?? `/strategies/${run.strategyId}/runs/${run.id}`,
      generationId: run.lastOutputGenerationId ?? null,
    });
  }, []);

  const handleRetryFetch = useCallback(() => {
    fetchDispatch({ type: 'setLoading', loading: true });
    fetchBatches();
  }, [fetchBatches]);

  if (fetchState.loading) {
    return <BatchLoadingSkeleton />;
  }

  if (fetchState.fetchError) {
    return <BatchErrorCard error={fetchState.fetchError} onRetry={handleRetryFetch} />;
  }

  return (
    <div ref={containerRef} className="space-y-4">
      <BatchToolbar
        from={appliedRange.from}
        to={appliedRange.to}
        onChange={handleDateChange}
        onClear={handleClearDate}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {fetchState.refreshing && (
        <div className="text-body text-text-muted flex items-center gap-2">
          <Spinner size="sm" />
          Loading {source === 'benchmark' ? 'benchmark' : 'standard'} runs…
        </div>
      )}

      <BatchList
        batches={fetchState.batches}
        loading={fetchState.loading}
        refreshing={fetchState.refreshing}
        hasMore={fetchState.hasMore}
        loadingMore={fetchState.loadingMore}
        appliedFrom={appliedRange.from}
        appliedTo={appliedRange.to}
        sentinelRef={sentinelRef}
        expandedIds={expandedIds}
        source={source}
        viewMode={viewMode}
        retryingBatchId={pending.retryingBatchId}
        deletingBatchId={pending.deletingBatchId}
        retryingRunId={pending.retryingRunId}
        onToggle={handleToggle}
        onRetryFailed={handleRetryFailed}
        onDeleteBatch={handleDeleteBatch}
        onRetry={handleRetry}
        onRated={fetchBatchesKeepScroll}
        onImageClick={handleImageClick}
      />
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
