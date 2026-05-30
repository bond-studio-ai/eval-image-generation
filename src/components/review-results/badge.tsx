'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import type { ReviewState } from '@/components/review-badge';
import { serviceUrl } from '@/lib/api-base';
import { MaskIcon } from './icons';
import { ReviewModal } from './modal';
import type { ReviewRecord } from './types';

interface ReviewResultsBadgeProps {
  generationId: string | null | undefined;
  /** Same per-id state the inline `ReviewBadge` shows; the dot
   * only appears when this is `done`, so the icon doesn't compete with
   * the inline run/check spinner under the preset name. */
  state: ReviewState | undefined;
}

/**
 * Small floating button that fetches and reveals the review results
 * modal for a generation. The fetch is deferred until the user opens
 * the modal (no work for generations the reviewer never inspects),
 * and we re-fetch whenever the parent's `state` transitions out of
 * `done` so a force re-run swaps in the fresh row.
 */
export function ReviewResultsBadge({ generationId, state }: ReviewResultsBadgeProps) {
  const [showModal, setShowModal] = useState(false);

  const ready = !!generationId && state?.kind === 'done';

  // Keying on the `state` object subsumes the old per-reference `isFresh`
  // cache: a force re-run hands us a brand-new `state`, producing a fresh
  // queryKey that re-fetches the next time the modal opens. Deferred until
  // the modal is actually open so generations the reviewer never inspects
  // do no work.
  const {
    data: currentRecord = null,
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: ['review-record', generationId, state],
    queryFn: async ({ signal }): Promise<ReviewRecord | null> => {
      const res = await fetch(serviceUrl(`generations/${generationId}/review`), {
        cache: 'no-store',
        signal,
      });
      if (!res.ok) throw new Error(`Failed to load review (${res.status})`);
      const json = (await res.json()) as { data?: { record?: ReviewRecord } } | null;
      return json?.data?.record ?? null;
    },
    enabled: showModal && !!generationId,
    // Match the prior per-`state` cache: a record is immutable for a given
    // review state, so don't refetch on reopen; a force re-run yields a new
    // `state` object (new queryKey) and fetches fresh.
    staleTime: Infinity,
  });

  if (!ready) return null;

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setShowModal(true);
        }}
        title="View review results"
        className="absolute top-1 right-1 z-10 inline-flex items-center gap-0.5 rounded-full bg-purple-500/90 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm transition-colors hover:bg-purple-500"
      >
        <MaskIcon className="size-2.5" />
        Review
      </button>
      {showModal && (
        <ReviewModal
          generationId={generationId!}
          record={currentRecord}
          loading={loading}
          error={error ? error.message : null}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
