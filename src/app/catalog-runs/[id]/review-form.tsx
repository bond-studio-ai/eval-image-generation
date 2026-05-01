'use client';

import type { HumanVerdict } from '@/lib/catalog-feed-client';
import { extractUpstreamError } from '@/lib/proxy-error';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface Props {
  runId: string;
}

const VERDICTS: { value: HumanVerdict; label: string; tone: string }[] = [
  { value: 'accept', label: 'Pass', tone: 'bg-green-600 hover:bg-green-700' },
  { value: 'reject', label: 'Fail', tone: 'bg-red-600 hover:bg-red-700' },
];

/**
 * ReviewForm submits a human verdict to the catalog-feed admin API via
 * the local Next proxy. Clerk provides the reviewer identity; the
 * server-side token wraps the outbound request so the admin API stays
 * auth-gated without leaking secrets to the browser.
 */
export function ReviewForm({ runId }: Props) {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [verdict, setVerdict] = useState<HumanVerdict | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const reviewerId = user?.primaryEmailAddress?.emailAddress ?? user?.id ?? '';

  const submit = async () => {
    if (!verdict) return;
    if (!reviewerId) {
      setError('Could not resolve reviewer identity from Clerk session');
      return;
    }
    setSubmitting(true);
    setError(null);
    setOk(false);
    try {
      const res = await fetch(`/api/v1/catalog-feed/admin/runs/${runId}/review`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          verdict,
          reviewerId,
          notes: notes.trim() || undefined,
        }),
      });
      if (!res.ok) {
        throw new Error(await extractUpstreamError(res));
      }
      setOk(true);
      setNotes('');
      setVerdict(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-4 space-y-4">
      <div>
        <label className="text-xs font-medium tracking-wide text-gray-600 uppercase">Verdict</label>
        <div className="mt-2 flex flex-wrap gap-2">
          {VERDICTS.map((v) => {
            const active = verdict === v.value;
            return (
              <button
                key={v.value}
                type="button"
                onClick={() => setVerdict(v.value)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium text-white shadow-xs transition-colors ${v.tone} ${active ? '' : 'opacity-50'}`}
              >
                {v.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="text-xs font-medium tracking-wide text-gray-600 uppercase">
          Notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="focus:border-primary-500 focus:ring-primary-500 mt-1 block w-full rounded-md border-gray-300 px-2 py-1.5 text-sm text-gray-900 shadow-xs"
          placeholder="What was right or wrong? This is auditable."
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={!verdict || submitting || !isLoaded}
          className="bg-primary-600 hover:bg-primary-700 disabled:bg-primary-300 inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white shadow-xs transition-colors"
        >
          {submitting ? 'Submitting…' : 'Submit review'}
        </button>
        {reviewerId && <span className="text-xs text-gray-500">Submitting as {reviewerId}</span>}
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800">
          {error}
        </div>
      )}
      {ok && (
        <div className="rounded-md border border-green-200 bg-green-50 p-3 text-xs text-green-800">
          Review submitted. The calibration job will consume it on the next run.
        </div>
      )}
    </div>
  );
}
