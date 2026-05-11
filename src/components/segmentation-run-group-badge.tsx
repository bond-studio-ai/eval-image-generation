'use client';

import {
  runSegmentationPost,
  type SegmentationState,
} from '@/components/segmentation-badge';
import { useCallback, useMemo } from 'react';

/**
 * Badge that fans out `POST /generations/:id/segmentation` for every
 * generation in a batch-run row instead of just the canonical/first one.
 *
 * The component owns no per-id state of its own — it derives an aggregate
 * label from the shared `statuses` map that the per-cell
 * `SegmentationBadge` instances also subscribe to. This means clicking
 * this badge immediately reflects on every individual cell's "Segmented"
 * dot (and vice versa), and a partial in-flight request from a per-cell
 * click never gets clobbered when this badge fires.
 *
 * Per-id `POST`s run *sequentially* (one image at a time). Running them
 * in parallel was overloading SAM upstream — the per-generation handler
 * already fans out across product categories in parallel, so layering
 * row-level parallelism on top multiplied the in-flight calls by N. A
 * single failure still doesn't block the rest of the row: we keep
 * walking the queue and surface each id's outcome individually on the
 * shared `statuses` map.
 *
 * Ids that are currently `running` or `checking` are skipped at click
 * time so re-clicking the badge can't double-fire while a previous run
 * is still in flight.
 *
 * When *every* tracked id has already been segmented, clicking the badge
 * re-runs all of them with `?force=true` (matches the per-cell badge's
 * "click to re-run" semantics). When the row is mixed (some done, some
 * idle) clicking runs only the un-segmented ids so re-clicking after a
 * partial failure does the right thing without wiping the masks that
 * already exist.
 */
interface SegmentationRunGroupBadgeProps {
  generationIds: string[];
  statuses: Map<string, SegmentationState>;
  setStatus: (id: string, state: SegmentationState) => void;
}

interface AggregateState {
  /**
   * - `idle`: no per-id state has resolved past `idle`.
   * - `checking`: at least one id is still hydrating from the backend.
   * - `running`: at least one POST is in flight.
   * - `done`: every id ended in `done`.
   * - `mixed`: a non-empty subset is `done`, the rest are `idle`/`error`.
   *   We still treat this as actionable (click to fill in the rest).
   * - `error`: every settled id is `error` (none `done`, none `running`).
   */
  kind: 'idle' | 'checking' | 'running' | 'done' | 'mixed' | 'error';
  /** Total ids the badge is responsible for. */
  total: number;
  /** Count currently `running`. */
  running: number;
  /** Count currently `done`. */
  done: number;
  /** Count currently `error`. */
  errors: number;
  /** Count currently `idle` (never started). */
  idle: number;
}

function aggregate(
  generationIds: string[],
  statuses: Map<string, SegmentationState>,
): AggregateState {
  const total = generationIds.length;
  let running = 0;
  let done = 0;
  let errors = 0;
  let checking = 0;
  let idle = 0;
  for (const id of generationIds) {
    const state = statuses.get(id) ?? { kind: 'idle' as const };
    if (state.kind === 'running') running++;
    else if (state.kind === 'done') done++;
    else if (state.kind === 'error') errors++;
    else if (state.kind === 'checking') checking++;
    else idle++;
  }

  let kind: AggregateState['kind'];
  if (running > 0) kind = 'running';
  else if (checking > 0 && done === 0 && errors === 0 && idle === 0) kind = 'checking';
  else if (done === total) kind = 'done';
  else if (errors === total) kind = 'error';
  else if (done > 0) kind = 'mixed';
  else kind = 'idle';

  return { kind, total, running, done, errors, idle };
}

export function SegmentationRunGroupBadge({
  generationIds,
  statuses,
  setStatus,
}: SegmentationRunGroupBadgeProps) {
  const summary = useMemo(
    () => aggregate(generationIds, statuses),
    [generationIds, statuses],
  );

  const runForAll = useCallback(async () => {
    // Capture targets at click time so a state-change race (e.g. a
    // per-cell click landing between `aggregate` and here) can't make
    // us double-fire on an id that is already running.
    const targets: Array<{ id: string; force: boolean }> = [];
    for (const id of generationIds) {
      const state = statuses.get(id) ?? { kind: 'idle' as const };
      if (state.kind === 'running' || state.kind === 'checking') continue;
      targets.push({ id, force: state.kind === 'done' });
    }
    if (targets.length === 0) return;

    // Optimistic transition so the row badge (and every cell) flips to
    // "Segmenting" before the network round-trip resolves. We flip *all*
    // targets up front (not just the one we're about to await) so the
    // row badge's `running` aggregate matches the user's mental model of
    // "I asked for all of them" even though we'll process them one by one.
    for (const target of targets) {
      setStatus(target.id, { kind: 'running' });
    }

    // Walk the queue sequentially. A single failure must not stop the
    // rest of the row, so we swallow per-id throws here — `runSegmentationPost`
    // already maps backend errors into a `SegmentationState` of kind
    // `error`, so the only way `await` rejects is a programming bug we'd
    // rather surface as a per-cell error than as an unhandled rejection.
    for (const { id, force } of targets) {
      let next: SegmentationState;
      try {
        next = await runSegmentationPost(id, force);
      } catch (err) {
        next = {
          kind: 'error',
          message: err instanceof Error ? err.message : 'Unexpected error',
        };
      }
      setStatus(id, next);
    }
  }, [generationIds, statuses, setStatus]);

  if (generationIds.length === 0) return null;

  if (summary.kind === 'checking') {
    return (
      <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
        <Spinner className="h-2.5 w-2.5" />
        Checking
      </span>
    );
  }

  if (summary.kind === 'running') {
    // `completed` includes both done and error so the counter monotonically
    // advances toward `total` instead of stalling on partial failures.
    const completed = summary.done + summary.errors;
    return (
      <span
        className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-500/90 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm"
        title={`Segmenting ${completed}/${summary.total} generations`}
      >
        <Spinner className="h-2.5 w-2.5" />
        Segmenting {completed}/{summary.total}
      </span>
    );
  }

  if (summary.kind === 'done') {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          runForAll();
        }}
        title="All segmentations complete. Click to re-run all with force=true."
        className="mt-1 inline-flex items-center gap-1 rounded-full bg-gray-700/80 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm transition-colors hover:bg-gray-700"
      >
        <CheckIcon className="h-2.5 w-2.5" />
        Segmented {summary.done}/{summary.total}
      </button>
    );
  }

  if (summary.kind === 'mixed') {
    // Click runs whatever is idle/error (force=false on those, force=true
    // on the already-done ones to keep them in sync with a fresh re-run).
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          runForAll();
        }}
        title={`${summary.done}/${summary.total} segmented. Click to finish the rest.`}
        className="mt-1 inline-flex items-center gap-1 rounded-full bg-gray-700/80 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm transition-colors hover:bg-gray-700"
      >
        <CheckIcon className="h-2.5 w-2.5" />
        Segmented {summary.done}/{summary.total}
      </button>
    );
  }

  if (summary.kind === 'error') {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          runForAll();
        }}
        title="All segmentations failed. Click to retry."
        className="mt-1 inline-flex items-center gap-1 rounded-full bg-red-500/90 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm transition-colors hover:bg-red-500"
      >
        <ErrorIcon className="h-2.5 w-2.5" />
        Segmentation failed
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        runForAll();
      }}
      title={`Automate QA (SAM segmentation) for all ${summary.total} generations in this row.`}
      className="mt-1 inline-flex items-center gap-1 rounded-full border border-gray-300 bg-white px-1.5 py-0.5 text-[10px] font-medium text-gray-700 transition-colors hover:border-gray-400 hover:bg-gray-50"
    >
      <SparkleIcon className="h-2.5 w-2.5" />
      Automate QA ({summary.total})
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
