import ms from "ms";
import { serviceUrl } from "@/lib/api-base";
import { parseJsonOrEmpty } from "@/lib/async-utils";
import { HTTP_UNPROCESSABLE_ENTITY } from "@/lib/http-status";
import type { ReviewState } from "./review-badge";

/** ~3 minutes is enough for the synchronous SAM fan-out + plugin loop on the slowest projects. */
const REVIEW_POST_TIMEOUT_MS = ms("3m");

/**
 * Single-generation `POST /generations/:id/review` call that resolves
 * to the final `ReviewState` for the badge. Shared between the
 * per-generation `ReviewBadge` and the row-level
 * `ReviewRunGroupBadge` so both code paths report the same
 * `done`/`error` shape (cached flag, success counts, error message).
 */
export async function runReviewPost(generationId: string, force: boolean): Promise<ReviewState> {
  try {
    const url = serviceUrl(`generations/${generationId}/review${force ? "?force=true" : ""}`);
    const res = await fetch(url, {
      method: "POST",
      signal: AbortSignal.timeout(REVIEW_POST_TIMEOUT_MS)
    });
    const json = (await parseJsonOrEmpty(res)) as {
      data?: { cached?: boolean; succeeded?: number; promptCount?: number };
      error?: { message?: string };
    };

    if (!res.ok) {
      const message = json?.error?.message ?? (res.status === HTTP_UNPROCESSABLE_ENTITY ? "Nothing to review" : `Review failed (${res.status})`);
      return { kind: "error", message };
    }

    const data = json?.data ?? {};
    return {
      kind: "done",
      cached: data.cached === true,
      ...(typeof data.succeeded === "number" ? { succeeded: data.succeeded } : {}),
      ...(typeof data.promptCount === "number" ? { total: data.promptCount } : {})
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Network error";
    return { kind: "error", message };
  }
}
