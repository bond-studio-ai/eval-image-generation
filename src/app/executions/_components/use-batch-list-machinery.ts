'use client';

import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

/**
 * Infinite-scroll trigger and horizontal-scroll-restoration machinery for
 * `BatchRunsTab`. Data fetching, pagination, and polling now live in the
 * component's `useInfiniteQuery`; this hook only owns the IntersectionObserver
 * that calls `loadMore` and the scroll-position snapshot/restore around a
 * `refetch` (so re-rating a run doesn't reset the matrix's horizontal scroll).
 */
export function useBatchListMachinery({
  hasMore,
  loadingMore,
  loadMore,
  refetch,
}: {
  hasMore: boolean;
  loadingMore: boolean;
  loadMore: () => void;
  refetch: () => Promise<unknown>;
}) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pendingScrollRef = useRef<number[] | null>(null);

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

  const refetchKeepScroll = useCallback(async () => {
    const scrollers = containerRef.current?.querySelectorAll<HTMLElement>('.overflow-x-auto');
    pendingScrollRef.current = scrollers ? Array.from(scrollers).map((el) => el.scrollLeft) : [];
    await refetch();
  }, [refetch]);

  return { sentinelRef, containerRef, refetchKeepScroll };
}
