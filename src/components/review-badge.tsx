'use client';

import { useCallback, useEffect, useState } from 'react';
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
  const [state, setState] = useState<ReviewState>(initialState ?? { kind: 'idle' });

  useEffect(() => {
    if (initialState) setState(initialState);
  }, [initialState]);

  const transition = useCallback(
    (next: ReviewState) => {
      setState(next);
      onStateChange?.(next);
    },
    [onStateChange],
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
        <ErrorIcon className="size-2.5" />
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
      <SparkleIcon className="size-2.5" />
      Automate QA
    </button>
  );
}

function Spinner({ className }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className ?? ''}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={3}
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function ErrorIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
      />
    </svg>
  );
}

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z"
      />
    </svg>
  );
}
