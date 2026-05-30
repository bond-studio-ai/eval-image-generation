'use client';

import { Badge, Button, toast } from '@/components/ui';
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
        if (!res.ok) {
          toast.error('Failed to activate strategy', {
            description: `Server responded with ${res.status}.`,
          });
          return;
        }
        toast.success(`Activated for ${SOURCES.find((s) => s.value === source)?.label ?? source}`);
        router.refresh();
      } catch (e) {
        toast.error('Failed to activate strategy', {
          description: e instanceof Error ? e.message : undefined,
        });
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
      if (!res.ok) {
        toast.error('Failed to deactivate strategy', {
          description: `Server responded with ${res.status}.`,
        });
        return;
      }
      toast.success('Strategy deactivated');
      router.refresh();
    } catch (e) {
      toast.error('Failed to deactivate strategy', {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setPendingSource(null);
    }
  }, [strategyId, router]);

  const busy = pendingSource !== null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {activeForSource ? (
        <Badge tone="success" variant="soft">
          <span className="bg-success-600 mr-1 inline-block size-1.5 rounded-full" />
          Active for {SOURCES.find((s) => s.value === activeForSource)?.label ?? activeForSource}
        </Badge>
      ) : (
        <Badge tone="neutral" variant="soft">
          Inactive
        </Badge>
      )}

      {SOURCES.map((source) => {
        if (activeForSource === source.value) return null;
        const isPending = pendingSource === source.value;
        return (
          <Button
            key={source.value}
            variant="secondary"
            size="sm"
            onClick={() => activateFor(source.value)}
            disabled={busy && !isPending}
            loading={isPending}
            className="border-success-300 bg-success-50 text-success-700 hover:bg-success-100"
          >
            {isPending ? 'Activating…' : `Activate for ${source.label}`}
          </Button>
        );
      })}

      {activeForSource && (
        <Button
          variant="secondary"
          size="sm"
          onClick={deactivate}
          disabled={busy && pendingSource !== 'deactivate'}
          loading={pendingSource === 'deactivate'}
        >
          {pendingSource === 'deactivate' ? 'Deactivating…' : 'Deactivate'}
        </Button>
      )}
    </div>
  );
}
