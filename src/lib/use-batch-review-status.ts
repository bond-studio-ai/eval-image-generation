"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReviewState } from "@/components/review-badge";
import { serviceUrl } from "@/lib/api-base";

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
  generationIds: readonly (string | null | undefined)[],
  enabled: boolean
): {
  statuses: Map<string, ReviewState>;
  setStatus: (id: string, state: ReviewState) => void;
} {
  // Holds only the states this hook owns: GET-probe results plus user-driven
  // POST states pushed through `setStatus`. Everything else (cache hits, the
  // transient "checking" spinner) is derived during render, so the effect
  // never has to setState synchronously to prime the map.
  const [resolved, setResolved] = useState<Map<string, ReviewState>>(new Map());
  // Stable string key derived from the (possibly fresh-ref each render)
  // `generationIds` array. The effect should only re-run when the *set*
  // of ids changes, not when the parent re-renders.
  const idsKey = uniqueIds(generationIds).sort().join("|");
  const ids = useMemo(() => (idsKey ? idsKey.split("|") : []), [idsKey]);

  // Derive the badge map: our own resolved/user states win, then the module
  // cache (so collapse-then-re-expand shows prior probes immediately), then a
  // spinner for any id we're about to (or currently) probe.
  const statuses = useMemo(() => {
    const next = new Map<string, ReviewState>();
    for (const id of ids) {
      const own = resolved.get(id);
      if (own) {
        next.set(id, own);
        continue;
      }
      const cached = cache.get(id);
      if (cached) {
        next.set(id, cached);
        continue;
      }
      if (enabled) next.set(id, { kind: "checking" });
    }
    return next;
  }, [ids, resolved, enabled]);

  useEffect(() => {
    if (!enabled) return;
    const targets = ids.filter((id) => !cache.has(id));
    if (targets.length === 0) return;

    let cancelled = false;
    void (async () => {
      try {
        const results = await Promise.allSettled(targets.map((id) => probeDeduped(id)));
        if (cancelled) return;
        setResolved((prev) => {
          const next = new Map(prev);
          results.forEach((result, i) => {
            const id = targets[i];
            if (id === undefined) return;
            const probed: ReviewState =
              result.status === "fulfilled"
                ? result.value
                : {
                    kind: "error",
                    message: result.reason instanceof Error ? result.reason.message : "Network error"
                  };
            // If the user already kicked off a POST (or one already
            // completed) while the GET was racing, that state is more
            // authoritative than the GET probe — don't clobber it.
            const cached = cache.get(id);
            const winner: ReviewState = cached && (cached.kind === "running" || cached.kind === "done") ? cached : probed;
            next.set(id, winner);
          });
          return next;
        });
      } catch {
        /* probe failures fall back to the cached palette */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, ids]);

  const setStatus = useCallback((id: string, state: ReviewState) => {
    cache.set(id, state);
    setResolved((prev) => {
      const next = new Map(prev);
      next.set(id, state);
      return next;
    });
  }, []);

  return { statuses, setStatus };
}

function uniqueIds(ids: readonly (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
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
      const winner: ReviewState = prior && (prior.kind === "running" || prior.kind === "done") ? prior : resolved;
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
    cache: "no-store"
  });
  if (res.status === 404) return { kind: "idle" };
  if (!res.ok) return { kind: "error", message: `HTTP ${res.status}` };
  // Successful GET means a record exists. We don't have prompt counts here
  // (those only come back from POST), so the badge falls back to "Reviewed".
  return { kind: "done" };
}
