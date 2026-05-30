'use client';

import { useCallback, useLayoutEffect, useRef } from 'react';

/**
 * Preserves the horizontal scroll position of nested `.overflow-x-auto`
 * scrollers across a refetch. Both executions tabs re-fetch their rows after
 * a rating action, which remounts the wide matrix/table and would otherwise
 * snap every horizontal scroller back to the left edge.
 *
 * Attach `containerRef` to the element that wraps the scrollers, and call
 * `fetchWithScrollPreserved` instead of the raw refetch — it snapshots each
 * scroller's `scrollLeft`, awaits the refetch, then restores them on the next
 * layout pass before the browser paints.
 */
export function useKeepScrollOnRefetch(refetch: () => Promise<void>) {
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

  const fetchWithScrollPreserved = useCallback(async () => {
    const scrollers = containerRef.current?.querySelectorAll<HTMLElement>('.overflow-x-auto');
    pendingScrollRef.current = scrollers ? Array.from(scrollers).map((el) => el.scrollLeft) : [];
    await refetch();
  }, [refetch]);

  return { containerRef, fetchWithScrollPreserved };
}
