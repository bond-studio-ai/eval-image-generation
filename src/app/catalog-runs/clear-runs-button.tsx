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
      const body = (await res.json()) as ClearRunsResponse;
      if (!res.ok) {
        throw new Error(
          (body as { error?: { message?: string } })?.error?.message ?? `HTTP ${res.status}`,
        );
      }
      setMatched(body.matched ?? 0);
      setSnapshotAt(body.snapshotAt ?? null);
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
      const body = (await res.json()) as ClearRunsResponse;
      if (!res.ok) {
        throw new Error(
          (body as { error?: { message?: string } })?.error?.message ?? `HTTP ${res.status}`,
        );
      }
      setLastDeleted(body.deleted ?? 0);
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
          Clear runs…
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
      {error && <span className="max-w-md text-right text-xs text-red-700">Failed: {error}</span>}
    </div>
  );
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
