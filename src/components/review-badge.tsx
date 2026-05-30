'use client';

import { AlertCircleIcon, CheckIcon, SparklesIcon, Spinner } from '@/components/ui';
import { useCallback, useState } from 'react';
import { runReviewPost } from './run-review-post';

/**
 * One badge state per `generationId`. Mirrors the lifecycle of the
 * review pipeline (SAM fan-out + every registered review plugin) for
 * that generation: not yet kicked off, currently being hydrated from
 * the backend, currently running, finished, or failed. `done` carries
 * the success/total counts when we have them (only after a fresh
 * POST — GET responses don't include the counts).
 */
export type ReviewState =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'running' }
  | { kind: 'done'; cached?: boolean; succeeded?: number; total?: number }
  | { kind: 'error'; message?: string };

interface SegmentationBadgeProps {
  generationId: string | null | undefined;
  /**
   * Initial state seeded by the parent (typically from
   * `useBatchReviewStatus`'s parallel hydration on accordion
   * expand). Defaults to `idle`. The component takes over once the
   * user clicks the badge.
   */
  initialState?: ReviewState;
  /** Notified whenever the badge transitions. Used by the parent to keep its
   * shared cache in sync so collapsing + re-expanding doesn't lose progress. */
  onStateChange?: (next: ReviewState) => void;
}

export function ReviewBadge({ generationId, initialState, onStateChange }: SegmentationBadgeProps) {
  // When the parent owns the state (it passes `onStateChange`, e.g. the shared
  // `useBatchReviewStatus` cache), `initialState` is the single source of truth
  // and we render it directly — no effect mirroring the prop into local state.
  // Standalone callers (no `onStateChange`) fall back to local state.
  const isControlled = onStateChange !== undefined;
  const [localState, setLocalState] = useState<ReviewState>(initialState ?? { kind: 'idle' });
  const state = isControlled ? (initialState ?? { kind: 'idle' }) : localState;

  const transition = useCallback(
    (next: ReviewState) => {
      if (!isControlled) setLocalState(next);
      onStateChange?.(next);
    },
    [isControlled, onStateChange],
  );

  const runReview = useCallback(
    async (force: boolean) => {
      if (!generationId) return;
      transition({ kind: 'running' });
      const next = await runReviewPost(generationId, force);
      transition(next);
    },
    [generationId, transition],
  );

  if (!generationId) return null;

  if (state.kind === 'checking') {
    return (
      <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
        <Spinner className="size-2.5" />
        Checking
      </span>
    );
  }

  if (state.kind === 'running') {
    return (
      <span
        className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-500/90 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm"
        title="Review in progress"
      >
        <Spinner className="size-2.5" />
        Reviewing
      </span>
    );
  }

  if (state.kind === 'done') {
    const label =
      typeof state.succeeded === 'number' && typeof state.total === 'number'
        ? `Reviewed ${state.succeeded}/${state.total}`
        : 'Reviewed';
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          runReview(true);
        }}
        title={state.cached ? 'Cached. Click to re-run.' : 'Click to re-run review.'}
        className="mt-1 inline-flex items-center gap-1 rounded-full bg-gray-700/80 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm transition-colors hover:bg-gray-700"
      >
        <CheckIcon className="size-2.5" />
        {label}
      </button>
    );
  }

  if (state.kind === 'error') {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          runReview(false);
        }}
        title={state.message ?? 'Click to retry.'}
        className="mt-1 inline-flex items-center gap-1 rounded-full bg-red-500/90 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm transition-colors hover:bg-red-500"
      >
        <AlertCircleIcon className="size-2.5" />
        Review failed
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        runReview(false);
      }}
      className="mt-1 inline-flex items-center gap-1 rounded-full border border-gray-300 bg-white px-1.5 py-0.5 text-[10px] font-medium text-gray-700 transition-colors hover:border-gray-400 hover:bg-gray-50"
    >
      <SparklesIcon className="size-2.5" />
      Automate QA
    </button>
  );
}
