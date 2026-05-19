'use client';

import { serviceUrl } from '@/lib/api-base';
import type { StrategyRunSource } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

const SOURCES: ReadonlyArray<{ value: StrategyRunSource; label: string }> = [
  { value: 'dollhouse', label: 'Dollhouse' },
  { value: 'photo', label: 'Photo' },
  { value: 'pdp', label: 'PDP' },
];

/**
 * Per-source active toggle. A strategy can be the active one for `dollhouse`,
 * `photo`, `pdp`, or for none — but not for more than one at a time.
 * Activating a strategy for a source unseats whichever strategy was previously
 * active for that source.
 */
export function ActiveToggleButton({
  strategyId,
  activeForSource,
}: {
  strategyId: string;
  activeForSource: StrategyRunSource | null;
}) {
  const router = useRouter();
  const [pendingSource, setPendingSource] = useState<StrategyRunSource | 'deactivate' | null>(null);

  const activateFor = useCallback(
    async (source: StrategyRunSource) => {
      setPendingSource(source);
      try {
        const res = await fetch(serviceUrl(`strategies/${strategyId}/activate?source=${source}`), {
          method: 'POST',
        });
        if (!res.ok) return;
        router.refresh();
      } catch {
        // ignore
      } finally {
        setPendingSource(null);
      }
    },
    [strategyId, router],
  );

  const deactivate = useCallback(async () => {
    setPendingSource('deactivate');
    try {
      const res = await fetch(serviceUrl(`strategies/${strategyId}/deactivate`), {
        method: 'POST',
      });
      if (!res.ok) return;
      router.refresh();
    } catch {
      // ignore
    } finally {
      setPendingSource(null);
    }
  }, [strategyId, router]);

  const busy = pendingSource !== null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {activeForSource ? (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-sm font-medium text-green-700 ring-1 ring-green-600/20 ring-inset">
          <span className="h-2 w-2 rounded-full bg-green-600" />
          Active for {SOURCES.find((s) => s.value === activeForSource)?.label ?? activeForSource}
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 px-3 py-1 text-sm font-medium text-gray-600 ring-1 ring-gray-300 ring-inset">
          Inactive
        </span>
      )}

      {SOURCES.map((source) => {
        if (activeForSource === source.value) return null;
        const isPending = pendingSource === source.value;
        return (
          <button
            key={source.value}
            type="button"
            onClick={() => activateFor(source.value)}
            disabled={busy}
            className="inline-flex items-center rounded-lg border border-green-300 bg-green-50 px-3 py-1.5 text-sm font-medium text-green-700 shadow-sm transition-colors hover:bg-green-100 disabled:opacity-50"
          >
            {isPending ? 'Activating…' : `Activate for ${source.label}`}
          </button>
        );
      })}

      {activeForSource && (
        <button
          type="button"
          onClick={deactivate}
          disabled={busy}
          className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-50"
        >
          {pendingSource === 'deactivate' ? 'Deactivating…' : 'Deactivate'}
        </button>
      )}
    </div>
  );
}
