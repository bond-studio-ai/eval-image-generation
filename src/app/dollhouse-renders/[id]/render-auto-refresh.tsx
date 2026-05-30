'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Banner } from '@/components/ui/banner';
import { RefreshIcon } from '@/components/ui/icons';
import { Spinner } from '@/components/ui/spinner';

interface RenderAutoRefreshProps {
  status: string;
}

const REFRESH_INTERVAL_MS = 5_000;
const TICK_MS = 1_000;
const FLASH_MS = 400;

/**
 * Keep render detail pages fresh while the renderer is still working. Without
 * this, a user lands on the detail page immediately after create and sees an
 * empty frame list forever unless they manually refresh, even when the callback
 * completes 10-20 seconds later.
 *
 * Renders a visible status banner so it's obvious the page is actively polling
 * (the previous silent setInterval was easy to misread as "stuck"). The
 * spinner-flash on each refresh acknowledges the network round-trip.
 */
export function RenderAutoRefresh({ status }: RenderAutoRefreshProps) {
  const router = useRouter();
  const isPolling = status === 'pending' || status === 'posted';

  const [secondsLeft, setSecondsLeft] = useState(REFRESH_INTERVAL_MS / 1000);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!isPolling) return;

    // We have to track every timer the effect spawns so cleanup can clear
    // them all. The flash `setTimeout` in particular previously leaked past
    // unmount/status-change and would call `setRefreshing(false)` on a stale
    // effect, which React surfaces as a no-op warning in dev.
    const flashTimeouts = new Set<number>();

    const tick = window.setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - TICK_MS / 1000));
    }, TICK_MS);

    const refresh = window.setInterval(() => {
      setRefreshing(true);
      router.refresh();
      const flash = window.setTimeout(() => {
        flashTimeouts.delete(flash);
        setRefreshing(false);
      }, FLASH_MS);
      flashTimeouts.add(flash);
      setSecondsLeft(REFRESH_INTERVAL_MS / 1000);
    }, REFRESH_INTERVAL_MS);

    return () => {
      window.clearInterval(tick);
      window.clearInterval(refresh);
      for (const flash of flashTimeouts) window.clearTimeout(flash);
      flashTimeouts.clear();
    };
  }, [isPolling, router]);

  if (!isPolling) return null;

  // We deliberately do not wrap this in role="status" or aria-live="polite":
  // the countdown ticks every second and would otherwise spam assistive
  // tech. The status badge in the page header already announces the actual
  // state change (pending → completed) the user cares about.
  return (
    <div className="mt-4">
      <Banner
        tone="info"
        icon={refreshing ? <Spinner size="xs" /> : <RefreshIcon className="size-4" aria-hidden />}
        description={
          refreshing
            ? 'Refreshing now...'
            : `Render in progress — auto-refreshing in ${Math.ceil(secondsLeft)}s`
        }
      />
    </div>
  );
}
