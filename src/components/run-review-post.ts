import { serviceUrl } from '@/lib/api-base';
import type { ReviewState } from './review-badge';

/** ~3 minutes is enough for the synchronous SAM fan-out + plugin loop on the slowest projects. */
const REVIEW_POST_TIMEOUT_MS = 180_000;

/**
 * Single-generation `POST /generations/:id/review` call that resolves
 * to the final `ReviewState` for the badge. Shared between the
 * per-generation `ReviewBadge` and the row-level
 * `ReviewRunGroupBadge` so both code paths report the same
 * `done`/`error` shape (cached flag, success counts, error message).
 */
export async function runReviewPost(generationId: string, force: boolean): Promise<ReviewState> {
  try {
    const url = serviceUrl(`generations/${generationId}/review${force ? '?force=true' : ''}`);
    const res = await fetch(url, {
      method: 'POST',
      signal: AbortSignal.timeout(REVIEW_POST_TIMEOUT_MS),
    });
    const json = (await res.json().catch(() => null)) as {
      data?: { cached?: boolean; succeeded?: number; promptCount?: number };
      error?: { message?: string };
    } | null;

    if (!res.ok) {
      const message =
        json?.error?.message ??
        (res.status === 422 ? 'Nothing to review' : `Review failed (${res.status})`);
      return { kind: 'error', message };
    }

    const data = json?.data ?? {};
    return {
      kind: 'done',
      cached: data.cached === true,
      succeeded: typeof data.succeeded === 'number' ? data.succeeded : undefined,
      total: typeof data.promptCount === 'number' ? data.promptCount : undefined,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Network error';
    return { kind: 'error', message };
  }
}
