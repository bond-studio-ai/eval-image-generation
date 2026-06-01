"use client";

import { useQueries, useQueryClient } from "@tanstack/react-query";
import { uniq } from "es-toolkit";
import { useCallback, useMemo } from "react";
import type { ReviewState } from "@/components/review-badge";
import { serviceUrl } from "@/lib/api-base";
import { HTTP_NOT_FOUND } from "@/lib/http-status";

function reviewStatusKey(id: string) {
  return ["review-status", id] as const;
}

/**
 * Single `GET /generations/:id/review` probe mapped to a badge state:
 *   - 200 → `done` (a review record exists)
 *   - 404 → `idle`
 *   - anything else → `error`
 */
async function probeReviewStatus(generationId: string): Promise<ReviewState> {
  const res = await fetch(serviceUrl(`generations/${generationId}/review`), { cache: "no-store" });
  if (res.status === HTTP_NOT_FOUND) return { kind: "idle" };
  if (!res.ok) return { kind: "error", message: `HTTP ${res.status}` };
  return { kind: "done" };
}

/**
 * Hydrate per-run review badge state for a batch view. While `enabled`, fires a
 * shared `GET /generations/:id/review` per id through React Query — which gives
 * us cross-instance request dedupe and a session-lived cache for free (replacing
 * the previous module-level cache + in-flight promise map).
 *
 * The returned `setStatus` writes user-driven POST results straight into the
 * query cache so they persist and stay authoritative: a `running`/`done` state
 * already in the cache is never clobbered by a slower GET probe.
 */
export function useBatchReviewStatus(
  generationIds: readonly (string | null | undefined)[],
  enabled: boolean
): {
  statuses: Map<string, ReviewState>;
  setStatus: (id: string, state: ReviewState) => void;
} {
  const queryClient = useQueryClient();

  // Stable string key derived from the (possibly fresh-ref each render)
  // `generationIds` array, so the queries only change when the *set* of ids does.
  const idsKey = uniq(generationIds.filter((id): id is string => Boolean(id)))
    .sort()
    .join("|");
  const ids = useMemo(() => (idsKey ? idsKey.split("|") : []), [idsKey]);

  const results = useQueries({
    queries: ids.map((id) => ({
      queryKey: reviewStatusKey(id),
      queryFn: async (): Promise<ReviewState> => {
        // A user-driven POST (running/done) pushed in via setStatus is more
        // authoritative than this GET probe — don't overwrite it.
        const prior = queryClient.getQueryData<ReviewState>(reviewStatusKey(id));
        if (prior && (prior.kind === "running" || prior.kind === "done")) return prior;
        return probeReviewStatus(id);
      },
      enabled,
      retry: false,
      staleTime: Number.POSITIVE_INFINITY,
      gcTime: Number.POSITIVE_INFINITY
    }))
  });

  const statuses = useMemo(() => {
    const next = new Map<string, ReviewState>();
    ids.forEach((id, i) => {
      const result = results[i];
      if (!result) return;
      if (result.data) {
        next.set(id, result.data);
        return;
      }
      if (result.isError) {
        next.set(id, { kind: "error", message: result.error instanceof Error ? result.error.message : "Network error" });
        return;
      }
      if (enabled) next.set(id, { kind: "checking" });
    });
    return next;
  }, [ids, results, enabled]);

  const setStatus = useCallback(
    (id: string, state: ReviewState) => {
      queryClient.setQueryData(reviewStatusKey(id), state);
    },
    [queryClient]
  );

  return { statuses, setStatus };
}
