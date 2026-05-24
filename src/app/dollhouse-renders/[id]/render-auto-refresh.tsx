'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface RenderAutoRefreshProps {
  status: string;
}

const REFRESH_INTERVAL_MS = 5_000;

/**
 * Keep render detail pages fresh while the renderer is still working. Without
 * this, a user lands on the detail page immediately after create and sees an
 * empty frame list forever unless they manually refresh, even when the callback
 * completes 10-20 seconds later.
 */
export function RenderAutoRefresh({ status }: RenderAutoRefreshProps) {
  const router = useRouter();

  useEffect(() => {
    if (status !== 'pending' && status !== 'posted') return;
    const id = window.setInterval(() => {
      router.refresh();
    }, REFRESH_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [router, status]);

  return null;
}
