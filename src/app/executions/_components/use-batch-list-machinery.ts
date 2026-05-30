'use client';

import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { isAwaitingJudgeBatch, type FetchState } from './batch-types';

const POLL_INTERVAL = 5000;

type FetchBatchesFn = (opts?: {
  replace?: boolean;
  pageToFetch?: number;
  mergeFirstPage?: boolean;
}) => Promise<void>;

/**
 * Infinite-scroll, polling, and horizontal-scroll-restoration machinery for
 * `BatchRunsTab`. The fetch state machine (`fetchReducer`) and the `fetchBatches`
 * callback stay in the component; this hook only owns the effects/refs that drive
 * and react to them so the orchestrator body stays readable. Behavior — including
 * the intentionally-stale fetch trigger and the eslint-disable below — is unchanged.
 */
export function useBatchListMachinery({
  fetchState,
  fetchBatches,
  from,
  to,
  source,
  refreshKey,
}: {
  fetchState: FetchState;
  fetchBatches: FetchBatchesFn;
  from: string;
  to: string;
  source: 'default' | 'benchmark';
  refreshKey?: number;
}) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pendingScrollRef = useRef<number[] | null>(null);

  const loadMore = useCallback(() => {
    if (fetchState.loadingMore || !fetchState.hasMore) return;
    fetchBatches({ replace: false, pageToFetch: fetchState.page + 1 });
  }, [fetchState.hasMore, fetchState.loadingMore, fetchState.page, fetchBatches]);

  useEffect(() => {
    fetchBatches({ replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, refreshKey, source]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !fetchState.hasMore || fetchState.loadingMore) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: '200px', threshold: 0 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [fetchState.hasMore, fetchState.loadingMore, loadMore]);

  const hasActive = fetchState.batches.some((b) => b.status === 'running');
  const hasAwaitingJudge = fetchState.batches.some((b) =>
    isAwaitingJudgeBatch(b.runs, b.numberOfImages),
  );
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
    async (...args: Parameters<FetchBatchesFn>) => {
      const scrollers = containerRef.current?.querySelectorAll<HTMLElement>('.overflow-x-auto');
      pendingScrollRef.current = scrollers ? Array.from(scrollers).map((el) => el.scrollLeft) : [];
      await fetchBatches(...args);
    },
    [fetchBatches],
  );

  return { sentinelRef, containerRef, fetchBatchesKeepScroll };
}
