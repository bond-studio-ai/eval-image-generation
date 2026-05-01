'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type ClearRunsResponse = {
  dryRun?: boolean;
  matched?: number;
  deleted?: number;
  snapshotAt?: string;
};

interface ClearRunsButtonProps {
  /**
   * Filters mirroring the page's current querystring. Only the
   * dimensions the backend actually understands are forwarded into
   * the destructive call: `scope`, `status`, `since`, `before`.
   *
   * `unsupportedFilters` is the set of page filters that have no
   * direct equivalent on the backend (`decision`, `minScore`,
   * `maxScore`). They are surfaced in the confirm copy so an
   * operator who narrowed the table by, say, decision=hold can't be
   * surprised that the clear ignored that constraint and deleted
   * a wider row set than the table showed (PR #26 review P1).
   */
  scope?: string;
  status?: string;
  since?: string;
  before?: string;
  unsupportedFilters?: string[];
}

/**
 * Two-step destructive action for the runs table.
 *
 * 1. First click → `DELETE /admin/runs` without `confirm=true`. The
 *    backend stamps a server-side `snapshotAt`, counts rows whose
 *    `started_at <= snapshotAt`, and returns both. The button
 *    holds onto the snapshot for the confirm step.
 * 2. Confirm click → same path with `confirm=true&snapshotAt=…`.
 *    The backend rebinds the DELETE to the same snapshot so any
 *    rows created in the gap between preview and confirm are
 *    spared (the contract is enforced server-side; the client just
 *    has to echo the value back honestly).
 *
 * Inline because server actions would force a full-page reload
 * between the count and the commit, which makes the "delete N
 * rows" copy feel disconnected from the click.
 */
export function ClearRunsButton({
  scope,
  status,
  since,
  before,
  unsupportedFilters = [],
}: ClearRunsButtonProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<'idle' | 'previewing' | 'confirm' | 'clearing'>('idle');
  const [matched, setMatched] = useState<number | null>(null);
  const [snapshotAt, setSnapshotAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastDeleted, setLastDeleted] = useState<number | null>(null);

  const buildUrl = (extras: Record<string, string | undefined>): string => {
    const qs = new URLSearchParams();
    if (scope) qs.set('scope', scope);
    if (status) qs.set('status', status);
    if (since) qs.set('since', since);
    if (before) qs.set('before', before);
    for (const [key, value] of Object.entries(extras)) {
      if (value !== undefined) qs.set(key, value);
    }
    const tail = qs.toString();
    return `/api/v1/catalog-feed/admin/runs${tail ? `?${tail}` : ''}`;
  };

  const preview = async () => {
    setError(null);
    setLastDeleted(null);
    setPhase('previewing');
    try {
      const res = await fetch(buildUrl({}), { method: 'DELETE' });
      const body = await readJsonBody(res);
      if (!res.ok) {
        throw new Error(extractErrorMessage(body) ?? `HTTP ${res.status}`);
      }
      // PR #27 follow-up (P1): a 2xx response with a non-JSON or
      // structurally-invalid body must not be treated as success.
      // Without this guard a stray HTML proxy page would silently
      // advance the operator into the destructive confirm phase.
      const parsed = parseClearRunsResponse(body);
      if (!parsed) {
        throw new Error(
          extractErrorMessage(body) ??
            'Backend returned an unexpected body shape. Likely an outdated deploy or proxy error page — verify api.bondstudio.ai is on the latest build before retrying.',
        );
      }
      if (parsed.snapshotAt == null) {
        throw new Error(
          'Backend returned no snapshotAt — confirm step would be unsafe. The DELETE /admin/runs endpoint may be running an older deploy. Retry once api.bondstudio.ai picks up the latest build.',
        );
      }
      setMatched(parsed.matched ?? 0);
      setSnapshotAt(parsed.snapshotAt);
      setPhase('confirm');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase('idle');
    }
  };

  const commit = async () => {
    setError(null);
    setPhase('clearing');
    try {
      const res = await fetch(
        buildUrl({
          confirm: 'true',
          snapshotAt: snapshotAt ?? undefined,
        }),
        { method: 'DELETE' },
      );
      const body = await readJsonBody(res);
      if (!res.ok) {
        throw new Error(extractErrorMessage(body) ?? `HTTP ${res.status}`);
      }
      // PR #27 follow-up (P1): refuse to mark the destructive call
      // successful unless the body proves the backend actually ran
      // it. Required signals: a JSON object with `dryRun === false`
      // (so we know we hit the destructive branch) AND a numeric
      // `deleted`. Anything else — proxy HTML, a stale 204 that
      // somehow leaked through, a confirm response that came back
      // as `dryRun:true` because the backend ignored our flag —
      // surfaces as an explicit error and keeps the operator in
      // the confirm phase rather than reporting a false success.
      const parsed = parseClearRunsResponse(body);
      if (!parsed) {
        throw new Error(
          extractErrorMessage(body) ??
            'Backend returned an unexpected body shape. Refusing to mark the clear successful.',
        );
      }
      if (parsed.dryRun !== false || typeof parsed.deleted !== 'number') {
        throw new Error(
          'Backend response did not confirm the destructive call ran. Re-preview before retrying.',
        );
      }
      setLastDeleted(parsed.deleted);
      setMatched(null);
      setSnapshotAt(null);
      setPhase('idle');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase('confirm');
    }
  };

  const cancel = () => {
    setPhase('idle');
    setMatched(null);
    setSnapshotAt(null);
    setError(null);
  };

  const filterSummary = filterDescription({ scope, status, since, before });
  const ignoredFilters = unsupportedFilters.filter(Boolean);

  return (
    <div className="flex flex-col items-end gap-1">
      {phase === 'idle' && (
        <button
          type="button"
          onClick={preview}
          className="rounded-md border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-700 shadow-xs hover:bg-red-50"
          title={`Clear ${filterSummary}${ignoredFilters.length > 0 ? ` (ignores ${ignoredFilters.join(', ')})` : ''}`}
        >
          Clear runs
        </button>
      )}
      {phase === 'previewing' && (
        <span className="text-xs text-gray-500">Counting matching runs…</span>
      )}
      {phase === 'confirm' && matched !== null && (
        <div className="flex max-w-3xl flex-col gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 shadow-xs">
          <span>
            {matched === 0
              ? `Nothing to clear for ${filterSummary}.`
              : `Delete ${matched} run${matched === 1 ? '' : 's'} (${filterSummary})? Cascaded artifacts, judge_evaluations, deterministic_checks, confidence_assessments, and human_reviews will go with them. Baselines, prompts, and calibrations are preserved.`}
          </span>
          {matched > 0 && ignoredFilters.length > 0 && (
            <span className="rounded border border-amber-300 bg-amber-50 px-2 py-1 text-xs text-amber-900">
              Heads up: the table is filtered by {ignoredFilters.join(', ')}, but the clear endpoint
              cannot honor those dimensions. The delete will target every run matching{' '}
              {filterSummary}, which may include rows hidden by your current view.
            </span>
          )}
          <div className="flex justify-end gap-2">
            {matched > 0 && (
              <button
                type="button"
                onClick={commit}
                className="rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white shadow-xs hover:bg-red-700"
              >
                Confirm clear
              </button>
            )}
            <button
              type="button"
              onClick={cancel}
              className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 shadow-xs hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {phase === 'clearing' && <span className="text-xs text-gray-500">Clearing runs…</span>}
      {lastDeleted !== null && phase === 'idle' && (
        <span className="text-xs text-emerald-700">
          Deleted {lastDeleted} run{lastDeleted === 1 ? '' : 's'} for {filterSummary}.
        </span>
      )}
      {error && (
        <div className="flex max-w-md flex-col items-end gap-1.5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 shadow-xs">
          <span className="text-right">Failed: {error}</span>
          <button
            type="button"
            onClick={phase === 'confirm' ? commit : preview}
            className="rounded-md border border-red-300 bg-white px-2 py-0.5 text-xs font-medium text-red-700 shadow-xs hover:bg-red-100"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}

// readJsonBody parses the response body as JSON without crashing
// when the backend returns 204 No Content (or anything else with an
// empty body). The original implementation called `res.json()`
// directly, which throws "Unexpected end of JSON input" on empty
// payloads — exactly the failure mode reported when huma's default
// DELETE status of 204 stripped the response body. Backend pinned
// 200 OK; this handler is the belt-and-braces.
//
// Empty bodies and parse failures are surfaced as a structured
// `{ error: { message } }` object so call sites can render a useful
// message without crashing. Callers must NOT treat a parse-error
// response as a successful destructive payload — preview/commit
// validate the shape via `parseClearRunsResponse` below.
async function readJsonBody(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (text.trim() === '') {
    return {
      error: {
        message: `Backend returned an empty body (HTTP ${res.status}).`,
      },
    };
  }
  try {
    const parsed: unknown = JSON.parse(text);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {
        error: {
          message: `Backend returned a non-object JSON response (HTTP ${res.status}): ${text.slice(0, 200)}`,
        },
      };
    }
    return parsed as Record<string, unknown>;
  } catch {
    return {
      error: {
        message: `Backend returned non-JSON response (HTTP ${res.status}): ${text.slice(0, 200)}`,
      },
    };
  }
}

// parseClearRunsResponse returns the typed view of the backend
// payload, or null if the body is structurally not a successful
// ClearRuns response (missing required keys, wrong types, or the
// `error` envelope readJsonBody emits for empty / non-JSON bodies).
function parseClearRunsResponse(body: Record<string, unknown>): ClearRunsResponse | null {
  if ('error' in body) return null;
  const hasShape =
    typeof body.dryRun === 'boolean' ||
    typeof body.matched === 'number' ||
    typeof body.deleted === 'number' ||
    typeof body.snapshotAt === 'string';
  if (!hasShape) return null;
  return {
    dryRun: typeof body.dryRun === 'boolean' ? body.dryRun : undefined,
    matched: typeof body.matched === 'number' ? body.matched : undefined,
    deleted: typeof body.deleted === 'number' ? body.deleted : undefined,
    snapshotAt: typeof body.snapshotAt === 'string' ? body.snapshotAt : undefined,
  };
}

function extractErrorMessage(body: Record<string, unknown>): string | null {
  const env = body.error;
  if (env && typeof env === 'object' && 'message' in env) {
    const m = (env as { message?: unknown }).message;
    if (typeof m === 'string' && m.length > 0) return m;
  }
  return null;
}

function filterDescription(filter: {
  scope?: string;
  status?: string;
  since?: string;
  before?: string;
}): string {
  const parts: string[] = [];
  if (filter.scope) parts.push(`scope=${filter.scope}`);
  if (filter.status) parts.push(`status=${filter.status}`);
  if (filter.since) parts.push(`since=${filter.since}`);
  if (filter.before) parts.push(`before=${filter.before}`);
  if (parts.length === 0) return 'all generation runs';
  return parts.join(' · ');
}
