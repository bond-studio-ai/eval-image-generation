'use client';

import type { ReviewState } from '@/components/review-badge';
import { serviceUrl } from '@/lib/api-base';
import { useEffect, useState } from 'react';
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
  // Cache the fetched record alongside the `state` reference it was fetched
  // under. A force re-run hands us a brand-new `state` object, so `isFresh`
  // flips to false automatically and the next modal open re-fetches — no
  // effect needed to reset the record when the prop changes.
  const [record, setRecord] = useState<{
    forState: ReviewState | undefined;
    data: ReviewRecord | null;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = !!generationId && state?.kind === 'done';
  const isFresh = record !== null && record.forState === state;
  const currentRecord = isFresh ? record.data : null;

  useEffect(() => {
    if (!showModal) return;
    if (!generationId) return;
    if (isFresh) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const res = await fetch(serviceUrl(`generations/${generationId}/review`), {
          cache: 'no-store',
        });
        if (!res.ok) {
          if (!cancelled) setError(`Failed to load review (${res.status})`);
          return;
        }
        const json = (await res.json()) as { data?: { record?: ReviewRecord } } | null;
        const next = json?.data?.record ?? null;
        if (!cancelled) setRecord({ forState: state, data: next });
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Network error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showModal, generationId, isFresh, state]);

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
          error={error}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
