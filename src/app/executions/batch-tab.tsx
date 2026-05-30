'use client';

import { GridLightbox } from '@/components/grid-lightbox';
import { Spinner, toast, useConfirm } from '@/components/ui';
import { serviceUrl } from '@/lib/api-base';
import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import { useCallback, useMemo, useReducer, useState } from 'react';
import { BatchErrorCard } from './_components/batch-error-card';
import { BatchList } from './_components/batch-list';
import { BatchLoadingSkeleton } from './_components/batch-loading-skeleton';
import { BatchToolbar } from './_components/batch-toolbar';
import { isAwaitingJudgeBatch, type BatchRow, type RunRow } from './_components/batch-types';
import { useBatchListMachinery } from './_components/use-batch-list-machinery';

const BATCH_PAGE_SIZE = 20;
const POLL_INTERVAL = 5000;
/** Stable empty set so `expandedIds` keeps a constant identity when collapsed. */
const EMPTY_EXPANDED: Set<string> = new Set<string>();

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

interface BatchPage {
  batches: BatchRow[];
  hasMore: boolean;
  page: number;
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
  const [pending, pendingDispatch] = useReducer(pendingReducer, initialPendingState);
  const [appliedRange, appliedRangeDispatch] = useReducer(
    appliedRangeReducer,
    initialAppliedRangeState,
  );
  // Expanded rows are scoped to the current filter/source/refresh "list key". Storing
  // that key alongside the ids lets a filter change collapse everything by derivation
  // (no reset effect): when `listKey` changes, `expandedIds` falls back to empty.
  const listKey = `${appliedRange.from}|${appliedRange.to}|${source}|${refreshKey ?? ''}`;
  const [expandedState, setExpandedState] = useState<{ key: string; ids: Set<string> }>({
    key: listKey,
    ids: new Set(),
  });
  const expandedIds = expandedState.key === listKey ? expandedState.ids : EMPTY_EXPANDED;
  const [viewMode, setViewMode] = useState<'list' | 'matrix'>('list');
  const [lightbox, setLightbox] = useState<{
    src: string;
    runHref: string;
    generationId: string | null;
  } | null>(null);

  const {
    data,
    isPending,
    isPlaceholderData,
    isError,
    error: queryError,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['strategy-batch-runs', appliedRange.from, appliedRange.to, source, refreshKey],
    queryFn: async ({ pageParam, signal }): Promise<BatchPage> => {
      const params = new URLSearchParams({
        page: String(pageParam),
        limit: String(BATCH_PAGE_SIZE),
      });
      if (appliedRange.from) params.set('from', appliedRange.from);
      if (appliedRange.to) params.set('to', appliedRange.to);
      if (source === 'benchmark') params.set('source', 'benchmark');
      const res = await fetch(serviceUrl(`strategy-batch-runs?${params}`), {
        cache: 'no-store',
        signal,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = (err as { error?: { message?: string } })?.error?.message;
        throw new Error(
          msg || `Failed to load (${res.status}). Check that the backend is reachable.`,
        );
      }
      const json = await res.json();
      const raw = (json.data ?? []) as Record<string, unknown>[];
      return { batches: raw.map(normalizeBatch), hasMore: json.hasMore === true, page: pageParam };
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
    // Keep the current list visible (with a "refreshing" hint) while a filter/source
    // change refetches, instead of flashing the skeleton.
    placeholderData: keepPreviousData,
    // Poll only while a batch is running or awaiting judging. A poll refetches every
    // loaded page, which naturally prunes deleted batches and surfaces new ones —
    // the merge/dedup the hand-rolled version did by hand.
    refetchInterval: (query) => {
      const pages = query.state.data?.pages ?? [];
      const polling = pages.some((p) =>
        p.batches.some(
          (b) => b.status === 'running' || isAwaitingJudgeBatch(b.runs, b.numberOfImages),
        ),
      );
      return polling ? POLL_INTERVAL : false;
    },
  });

  // Flatten paginated results, de-duping ids in case offset pagination shifts items.
  const batches = useMemo(() => {
    const seen = new Set<string>();
    const out: BatchRow[] = [];
    for (const p of data?.pages ?? []) {
      for (const b of p.batches) {
        if (!seen.has(b.id)) {
          seen.add(b.id);
          out.push(b);
        }
      }
    }
    return out;
  }, [data]);

  const loading = isPending;
  const refreshing = isPlaceholderData;
  const fetchError = isError
    ? queryError instanceof Error
      ? queryError.message
      : 'Network error. Check backend and try again.'
    : null;

  const loadMore = useCallback(() => {
    if (isFetchingNextPage || !hasNextPage) return;
    fetchNextPage();
  }, [isFetchingNextPage, hasNextPage, fetchNextPage]);

  const { sentinelRef, containerRef, refetchKeepScroll } = useBatchListMachinery({
    hasMore: hasNextPage,
    loadingMore: isFetchingNextPage,
    loadMore,
    refetch,
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
        await refetch();
      } catch {
        /* ignore */
      } finally {
        pendingDispatch({ type: 'retryingRun', id: null });
      }
    },
    [refetch],
  );

  const handleRetryFailed = useCallback(
    async (batchId: string) => {
      pendingDispatch({ type: 'retryingBatch', id: batchId });
      try {
        const res = await fetch(serviceUrl(`strategy-batch-runs/${batchId}/retry-failed`), {
          method: 'POST',
        });
        if (!res.ok) return;
        await refetch();
      } catch {
        /* ignore */
      } finally {
        pendingDispatch({ type: 'retryingBatch', id: null });
      }
    },
    [refetch],
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
        setExpandedState((prev) => {
          const ids = prev.key === listKey ? new Set(prev.ids) : new Set<string>();
          ids.delete(batchId);
          return { key: listKey, ids };
        });
        toast.success(`Deleted batch "${displayName}"`);
        await refetch();
      } catch (e) {
        toast.error('Failed to delete batch', {
          description: e instanceof Error ? e.message : undefined,
        });
      } finally {
        pendingDispatch({ type: 'deletingBatch', id: null });
      }
    },
    [refetch, confirm, listKey],
  );

  const handleToggle = useCallback(
    (batchId: string, isExpanded: boolean) => {
      setExpandedState((prev) => {
        const ids = prev.key === listKey ? new Set(prev.ids) : new Set<string>();
        if (isExpanded) ids.delete(batchId);
        else ids.add(batchId);
        return { key: listKey, ids };
      });
    },
    [listKey],
  );

  const handleImageClick = useCallback((run: RunRow) => {
    setLightbox({
      src: run.lastOutputUrl!,
      runHref: run.runHref ?? `/strategies/${run.strategyId}/runs/${run.id}`,
      generationId: run.lastOutputGenerationId ?? null,
    });
  }, []);

  const handleRetryFetch = useCallback(() => {
    refetch();
  }, [refetch]);

  if (loading) {
    return <BatchLoadingSkeleton />;
  }

  if (fetchError) {
    return <BatchErrorCard error={fetchError} onRetry={handleRetryFetch} />;
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

      {refreshing && (
        <div className="text-body text-text-muted flex items-center gap-2">
          <Spinner size="sm" />
          Loading {source === 'benchmark' ? 'benchmark' : 'standard'} runs…
        </div>
      )}

      <BatchList
        batches={batches}
        loading={loading}
        refreshing={refreshing}
        hasMore={hasNextPage}
        loadingMore={isFetchingNextPage}
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
        onRated={refetchKeepScroll}
        onImageClick={handleImageClick}
      />
      {lightbox && (
        <GridLightbox
          src={lightbox.src}
          runHref={lightbox.runHref}
          generationId={lightbox.generationId}
          onRated={() => refetchKeepScroll()}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  );
}
