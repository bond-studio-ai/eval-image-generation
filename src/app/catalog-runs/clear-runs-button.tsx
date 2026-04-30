'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type ClearRunsResponse = {
  dryRun?: boolean;
  matched?: number;
  deleted?: number;
};

interface ClearRunsButtonProps {
  /**
   * Filters mirroring the page's current querystring. Forwarded to the
   * backend so a clear scoped to "vanities:tearSheet" only wipes that
   * subset; an empty filter wipes every generation run.
   */
  scope?: string;
  status?: string;
  before?: string;
}

/**
 * Two-step destructive action for the runs table.
 *
 * Step 1 (dry-run, default): hits `DELETE /admin/runs` without
 * `confirm=true`, surfaces the number of rows that would be removed.
 * Step 2 (actual clear): only runs after the operator clicks Confirm.
 *
 * The button intentionally lives in a client component so the
 * confirmation dialog can be inline — server actions would need a
 * full-page reload between preview and commit, which makes the
 * "About to delete N rows" copy feel disconnected from the click.
 */
export function ClearRunsButton({ scope, status, before }: ClearRunsButtonProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<'idle' | 'previewing' | 'confirm' | 'clearing'>('idle');
  const [matched, setMatched] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastDeleted, setLastDeleted] = useState<number | null>(null);

  const buildUrl = (confirm: boolean): string => {
    const qs = new URLSearchParams();
    if (scope) qs.set('scope', scope);
    if (status) qs.set('status', status);
    if (before) qs.set('before', before);
    if (confirm) qs.set('confirm', 'true');
    const tail = qs.toString();
    return `/api/v1/catalog-feed/admin/runs${tail ? `?${tail}` : ''}`;
  };

  const preview = async () => {
    setError(null);
    setLastDeleted(null);
    setPhase('previewing');
    try {
      const res = await fetch(buildUrl(false), { method: 'DELETE' });
      const body = (await res.json()) as ClearRunsResponse;
      if (!res.ok) {
        throw new Error(
          (body as { error?: { message?: string } })?.error?.message ?? `HTTP ${res.status}`,
        );
      }
      setMatched(body.matched ?? 0);
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
      const res = await fetch(buildUrl(true), { method: 'DELETE' });
      const body = (await res.json()) as ClearRunsResponse;
      if (!res.ok) {
        throw new Error(
          (body as { error?: { message?: string } })?.error?.message ?? `HTTP ${res.status}`,
        );
      }
      setLastDeleted(body.deleted ?? 0);
      setMatched(null);
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
    setError(null);
  };

  const filterSummary = filterDescription({ scope, status, before });

  return (
    <div className="flex flex-col items-end gap-1">
      {phase === 'idle' && (
        <button
          type="button"
          onClick={preview}
          className="rounded-md border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-700 shadow-xs hover:bg-red-50"
          title={`Clear ${filterSummary}`}
        >
          Clear runs…
        </button>
      )}
      {phase === 'previewing' && (
        <span className="text-xs text-gray-500">Counting matching runs…</span>
      )}
      {phase === 'confirm' && matched !== null && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 shadow-xs">
          <span>
            {matched === 0
              ? `Nothing to clear for ${filterSummary}.`
              : `Delete ${matched} run${matched === 1 ? '' : 's'} (${filterSummary})? Cascaded artifacts, judge_evaluations, deterministic_checks, confidence_assessments, and human_reviews will go with them. Baselines, prompts, and calibrations are preserved.`}
          </span>
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

function filterDescription(filter: { scope?: string; status?: string; before?: string }): string {
  const parts: string[] = [];
  if (filter.scope) parts.push(`scope=${filter.scope}`);
  if (filter.status) parts.push(`status=${filter.status}`);
  if (filter.before) parts.push(`before=${filter.before}`);
  if (parts.length === 0) return 'all generation runs';
  return parts.join(' · ');
}
