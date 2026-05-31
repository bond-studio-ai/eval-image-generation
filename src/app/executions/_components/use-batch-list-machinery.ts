"use client";

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { useInView } from "react-intersection-observer";

/**
 * Infinite-scroll trigger and horizontal-scroll-restoration machinery for
 * `BatchRunsTab`. Data fetching, pagination, and polling now live in the
 * component's `useInfiniteQuery`; this hook only owns the sentinel-in-view
 * trigger that calls `loadMore` and the scroll-position snapshot/restore around
 * a `refetch` (so re-rating a run doesn't reset the matrix's horizontal scroll).
 */
export function useBatchListMachinery({ hasMore, loadingMore, loadMore, refetch }: { hasMore: boolean; loadingMore: boolean; loadMore: () => void; refetch: () => Promise<unknown> }) {
  const { ref: sentinelRef, inView } = useInView({ rootMargin: "200px" });
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pendingScrollRef = useRef<number[] | null>(null);

  useEffect(() => {
    if (inView && hasMore && !loadingMore) loadMore();
  }, [inView, hasMore, loadingMore, loadMore]);

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

  const refetchKeepScroll = useCallback(async () => {
    const scrollers = containerRef.current?.querySelectorAll<HTMLElement>(".overflow-x-auto");
    pendingScrollRef.current = scrollers ? Array.from(scrollers, (el) => el.scrollLeft) : [];
    await refetch();
  }, [refetch]);

  return { sentinelRef, containerRef, refetchKeepScroll };
}
