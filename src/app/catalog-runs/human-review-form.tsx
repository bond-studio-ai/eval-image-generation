'use client';

import type { HumanVerdict } from '@/lib/catalog-feed-client';
import { extractUpstreamError } from '@/lib/proxy-error';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

const VERDICTS: { value: HumanVerdict; label: string; tone: string }[] = [
  { value: 'accept', label: 'Pass', tone: 'bg-green-600 hover:bg-green-700' },
  { value: 'reject', label: 'Fail', tone: 'bg-red-600 hover:bg-red-700' },
];

const NOTE_DEBOUNCE_MS = 450;

type Props = {
  runId: string;
  /** Invoked only after a successful Pass, e.g. collapse the list accordion row. */
  onPassSubmitted?: () => void;
  /** Edit notes only for an existing reject review (detail page after refresh). */
  mode?: 'full' | 'rejectNotesOnly';
  /** Seed notes when mode is rejectNotesOnly. */
  initialNotes?: string;
};

/**
 * Full mode: notes are always visible; Pass/Fail POST includes the current notes.
 * rejectNotesOnly: debounced PATCH for editing notes on an existing fail review.
 */
export function HumanReviewForm({
  runId,
  onPassSubmitted,
  mode = 'full',
  initialNotes = '',
}: Props) {
  const notesOnly = mode === 'rejectNotesOnly';
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notesPatchError, setNotesPatchError] = useState<string | null>(null);
  /** Full mode: set after a successful Pass/Fail POST. */
  const [savedVerdict, setSavedVerdict] = useState<HumanVerdict | null>(null);
  const [notes, setNotes] = useState(initialNotes);
  const skipFirstNotePatch = useRef(true);

  const reviewerId = user?.primaryEmailAddress?.emailAddress ?? user?.id ?? '';

  const patchNotes = useCallback(
    async (text: string) => {
      setNotesPatchError(null);
      try {
        const res = await fetch(`/api/v1/catalog-feed/admin/runs/${runId}/review`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ notes: text }),
        });
        if (!res.ok) {
          throw new Error(await extractUpstreamError(res));
        }
      } catch (e) {
        setNotesPatchError(e instanceof Error ? e.message : String(e));
      }
    },
    [runId],
  );

  useEffect(() => {
    if (!notesOnly) return;
    if (skipFirstNotePatch.current) {
      skipFirstNotePatch.current = false;
      return;
    }
    const t = window.setTimeout(() => {
      void patchNotes(notes);
    }, NOTE_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [notes, notesOnly, patchNotes]);

  const postVerdict = async (verdict: HumanVerdict) => {
    if (!reviewerId) {
      setError('Could not resolve reviewer identity.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const trimmed = notes.trim();
      const res = await fetch(`/api/v1/catalog-feed/admin/runs/${runId}/review`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          verdict,
          reviewerId,
          ...(trimmed ? { notes: trimmed } : {}),
        }),
      });
      if (!res.ok) {
        const msg = await extractUpstreamError(res);
        if (res.status === 409) {
          throw new Error('This run already has a human review.');
        }
        throw new Error(msg);
      }
      setSavedVerdict(verdict);
      if (verdict === 'accept') {
        onPassSubmitted?.();
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  const locked = savedVerdict !== null || submitting || (!notesOnly && !isLoaded);

  if (notesOnly) {
    return (
      <div className="mt-4 rounded-md border border-gray-200 bg-white p-3">
        <label className="block text-xs font-medium tracking-wide text-gray-600 uppercase">
          Notes (fail)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="What was wrong? Saved automatically while you type."
          className="focus:border-primary-500 focus:ring-primary-500 mt-1 block w-full rounded-md border-gray-300 px-2 py-1.5 text-sm text-gray-900 shadow-xs"
        />
        {notesPatchError && (
          <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
            Could not save notes: {notesPatchError}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-md border border-gray-200 bg-white p-3">
      <div>
        <label className="block text-xs font-medium tracking-wide text-gray-600 uppercase">
          Notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={locked}
          rows={3}
          placeholder="Type notes first if needed, then choose Pass or Fail. Notes are saved with your verdict."
          className="focus:border-primary-500 focus:ring-primary-500 mt-1 block w-full rounded-md border-gray-300 px-2 py-1.5 text-sm text-gray-900 shadow-xs disabled:bg-gray-50 disabled:text-gray-500"
        />
      </div>

      <div className="mt-4">
        <label className="block text-xs font-medium tracking-wide text-gray-600 uppercase">
          Verdict
        </label>
        <div className="mt-1 flex flex-wrap gap-2">
          {VERDICTS.map((v) => {
            const active = savedVerdict === v.value;
            return (
              <button
                key={v.value}
                type="button"
                disabled={locked}
                onClick={() => void postVerdict(v.value)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium text-white shadow-xs transition-colors ${v.tone} ${active ? '' : savedVerdict ? 'opacity-50' : ''} disabled:cursor-not-allowed disabled:opacity-40`}
              >
                {v.label}
              </button>
            );
          })}
        </div>
      </div>

      {submitting && (
        <p className="mt-2 text-xs text-gray-500">Saving verdict…</p>
      )}

      {error && (
        <div className="mt-2 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-800">
          {error}
        </div>
      )}
      {reviewerId && (
        <p className="mt-2 text-[11px] text-gray-500">Reviewing as {reviewerId}</p>
      )}
    </div>
  );
}
