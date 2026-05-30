'use client';

import { useCallback, useMemo } from 'react';
import { type ReviewState } from '@/components/review-badge';
import { runReviewPost } from '@/components/run-review-post';
import { AlertCircleIcon, CheckIcon, SparklesIcon } from '@/components/ui/icons';
import { Spinner } from '@/components/ui/spinner';

/**
 * Badge that fans out `POST /generations/:id/review` for every
 * generation in a batch-run row instead of just the canonical/first one.
 *
 * The component owns no per-id state of its own — it derives an aggregate
 * label from the shared `statuses` map that the per-cell
 * `ReviewBadge` instances also subscribe to. This means clicking
 * this badge immediately reflects on every individual cell's "Reviewed"
 * dot (and vice versa), and a partial in-flight request from a per-cell
 * click never gets clobbered when this badge fires.
 *
 * Per-id `POST`s run *sequentially* (one image at a time). Running them
 * in parallel was overloading SAM upstream — the per-generation handler
 * already fans out across product categories and review plugins in
 * parallel, so layering row-level parallelism on top multiplied the
 * in-flight calls by N. A single failure still doesn't block the rest
 * of the row: we keep walking the queue and surface each id's outcome
 * individually on the shared `statuses` map.
 *
 * Ids that are currently `running` or `checking` are skipped at click
 * time so re-clicking the badge can't double-fire while a previous run
 * is still in flight.
 *
 * When *every* tracked id has already been reviewed, clicking the badge
 * re-runs all of them with `?force=true` (matches the per-cell badge's
 * "click to re-run" semantics). When the row is mixed (some done, some
 * idle) clicking runs only the un-reviewed ids so re-clicking after a
 * partial failure does the right thing without wiping the rows that
 * already exist.
 */
interface ReviewRunGroupBadgeProps {
  generationIds: string[];
  statuses: Map<string, ReviewState>;
  setStatus: (id: string, state: ReviewState) => void;
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

function aggregate(generationIds: string[], statuses: Map<string, ReviewState>): AggregateState {
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

export function ReviewRunGroupBadge({
  generationIds,
  statuses,
  setStatus,
}: ReviewRunGroupBadgeProps) {
  const summary = useMemo(() => aggregate(generationIds, statuses), [generationIds, statuses]);

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
    // "Reviewing" before the network round-trip resolves. We flip *all*
    // targets up front (not just the one we're about to await) so the
    // row badge's `running` aggregate matches the user's mental model of
    // "I asked for all of them" even though we'll process them one by one.
    for (const target of targets) {
      setStatus(target.id, { kind: 'running' });
    }

    // Walk the queue sequentially. A single failure must not stop the
    // rest of the row, so we swallow per-id throws here — `runReviewPost`
    // already maps backend errors into a `ReviewState` of kind
    // `error`, so the only way `await` rejects is a programming bug we'd
    // rather surface as a per-cell error than as an unhandled rejection.
    for (const { id, force } of targets) {
      let next: ReviewState;
      try {
        next = await runReviewPost(id, force);
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
        <Spinner className="size-2.5" />
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
        title={`Reviewing ${completed}/${summary.total} generations`}
      >
        <Spinner className="size-2.5" />
        Reviewing {completed}/{summary.total}
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
        title="All reviews complete. Click to re-run all with force=true."
        className="mt-1 inline-flex items-center gap-1 rounded-full bg-gray-700/80 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm transition-colors hover:bg-gray-700"
      >
        <CheckIcon className="size-2.5" />
        Reviewed {summary.done}/{summary.total}
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
        title={`${summary.done}/${summary.total} reviewed. Click to finish the rest.`}
        className="mt-1 inline-flex items-center gap-1 rounded-full bg-gray-700/80 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm transition-colors hover:bg-gray-700"
      >
        <CheckIcon className="size-2.5" />
        Reviewed {summary.done}/{summary.total}
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
        title="All reviews failed. Click to retry."
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
        runForAll();
      }}
      title={`Automate QA (review) for all ${summary.total} generations in this row.`}
      className="mt-1 inline-flex items-center gap-1 rounded-full border border-gray-300 bg-white px-1.5 py-0.5 text-[10px] font-medium text-gray-700 transition-colors hover:border-gray-400 hover:bg-gray-50"
    >
      <SparklesIcon className="size-2.5" />
      Automate QA ({summary.total})
    </button>
  );
}
