'use client';

import type { ReviewState } from '@/components/review-badge';
import { serviceUrl } from '@/lib/api-base';
import { useCallback, useEffect, useState } from 'react';

/**
 * Module-level cache of *resolved* review states only (`idle` /
 * `done` / `error` — never the transient `checking`). Keyed by the
 * generation id used in `POST /generations/:id/review`. Lets a
 * collapse-then-re-expand reuse the prior probe instead of refetching.
 */
const cache = new Map<string, ReviewState>();

/**
 * Promise dedupe for currently-in-flight `GET` probes. Multiple hook
 * instances (or React StrictMode's double-mount in dev) share the same
 * promise instead of firing parallel requests; the result is written
 * back to `cache` once, regardless of which subscriber's effect "wins".
 */
const inFlight = new Map<string, Promise<ReviewState>>();

/**
 * Hydrate per-run review badge state for a batch view. While
 * `enabled` is true, the hook fires `GET /generations/:id/review`
 * in parallel for every previously-unhydrated `generationId` (using
 * `Promise.allSettled` so one slow request doesn't block the others).
 * Results map straight to a `ReviewBadge` initial state:
 *   - 200 → `done`
 *   - 404 → `idle`
 *   - anything else → `error`
 *
 * The returned `setStatus` is wired into each badge's `onStateChange`
 * so user-driven runs stay reflected here too.
 */
export function useBatchReviewStatus(
  generationIds: ReadonlyArray<string | null | undefined>,
  enabled: boolean,
): {
  statuses: Map<string, ReviewState>;
  setStatus: (id: string, state: ReviewState) => void;
} {
  const [statuses, setStatuses] = useState<Map<string, ReviewState>>(() =>
    snapshotFromCache(generationIds),
  );
  // Stable string key derived from the (possibly fresh-ref each render)
  // `generationIds` array. The effect should only re-run when the *set*
  // of ids changes, not when the parent re-renders.
  const idsKey = uniqueIds(generationIds).sort().join('|');

  useEffect(() => {
    if (!enabled) return;
    const ids = idsKey ? idsKey.split('|') : [];

    // Prime local state with whatever the cache already has so collapses
    // and re-expansions show their resolved badges immediately.
    setStatuses((prev) => mergeWithCache(prev, ids));

    const targets = ids.filter((id) => !cache.has(id));
    if (targets.length === 0) return;

    // Show the spinner pill for every probe-in-flight target.
    setStatuses((prev) => {
      const next = new Map(prev);
      for (const id of targets) next.set(id, { kind: 'checking' });
      return next;
    });

    let cancelled = false;
    Promise.allSettled(targets.map((id) => probeDeduped(id))).then((results) => {
      if (cancelled) return;
      setStatuses((prev) => {
        const next = new Map(prev);
        results.forEach((result, i) => {
          const id = targets[i];
          const resolved: ReviewState =
            result.status === 'fulfilled'
              ? result.value
              : {
                  kind: 'error',
                  message: result.reason instanceof Error ? result.reason.message : 'Network error',
                };
          // If the user already kicked off a POST (or one already
          // completed) while the GET was racing, that state is more
          // authoritative than the GET probe — don't clobber it.
          const cached = cache.get(id);
          const winner: ReviewState =
            cached && (cached.kind === 'running' || cached.kind === 'done') ? cached : resolved;
          next.set(id, winner);
        });
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [enabled, idsKey]);

  const setStatus = useCallback((id: string, state: ReviewState) => {
    cache.set(id, state);
    setStatuses((prev) => {
      const next = new Map(prev);
      next.set(id, state);
      return next;
    });
  }, []);

  return { statuses, setStatus };
}

function uniqueIds(ids: ReadonlyArray<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

function snapshotFromCache(
  ids: ReadonlyArray<string | null | undefined>,
): Map<string, ReviewState> {
  const out = new Map<string, ReviewState>();
  for (const id of uniqueIds(ids)) {
    const hit = cache.get(id);
    if (hit) out.set(id, hit);
  }
  return out;
}

/** Layer cached resolved states on top of the current local map without
 * dropping any in-flight `checking`/`running` entries we set ourselves. */
function mergeWithCache(
  prev: Map<string, ReviewState>,
  ids: string[],
): Map<string, ReviewState> {
  const next = new Map(prev);
  for (const id of ids) {
    const hit = cache.get(id);
    if (hit) next.set(id, hit);
  }
  return next;
}

/**
 * Resolves to the review state for `generationId`, sharing a single
 * `GET` per id across all callers. The result is always written to the
 * module-level cache — even if every observer was unmounted while the
 * fetch was in flight — so the next mount picks it up immediately.
 */
function probeDeduped(generationId: string): Promise<ReviewState> {
  const cached = cache.get(generationId);
  if (cached) return Promise.resolve(cached);
  const existing = inFlight.get(generationId);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const resolved = await probe(generationId);
      const prior = cache.get(generationId);
      const winner: ReviewState =
        prior && (prior.kind === 'running' || prior.kind === 'done') ? prior : resolved;
      cache.set(generationId, winner);
      return winner;
    } finally {
      inFlight.delete(generationId);
    }
  })();

  inFlight.set(generationId, promise);
  return promise;
}

async function probe(generationId: string): Promise<ReviewState> {
  const res = await fetch(serviceUrl(`generations/${generationId}/review`), {
    cache: 'no-store',
  });
  if (res.status === 404) return { kind: 'idle' };
  if (!res.ok) return { kind: 'error', message: `HTTP ${res.status}` };
  // Successful GET means a record exists. We don't have prompt counts here
  // (those only come back from POST), so the badge falls back to "Reviewed".
  return { kind: 'done' };
}
