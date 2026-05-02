'use client';

import {
  DecisionBadge,
  formatDateTime,
  formatLatency,
  ScoreCell,
  StatusBadge,
} from '@/components/catalog-confidence/badges';
import type { AdminRunSummary, HumanVerdict } from '@/lib/catalog-feed-client';
import { withImageParams } from '@/lib/image-utils';
import { extractUpstreamError } from '@/lib/proxy-error';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface Props {
  run: AdminRunSummary;
  /**
   * Number of cells in the parent table's header. Forwarded into the
   * accordion's `colSpan` so the expanded body always spans the full
   * row regardless of how many score columns the page renders.
   */
  totalColumns: number;
}

/**
 * RunRow renders a single row in the runs list plus an inline
 * accordion showing input vs output images and the verdict form.
 *
 * Auto-expand contract:
 *   - Succeeded but unreviewed → expand by default so the reviewer
 *     sees the bytes-to-bytes comparison without clicking.
 *   - Failed → expand so the Gemini error is visible inline (failed
 *     runs aren't reviewable; the body just surfaces the failure).
 *   - Reviewed → collapsed by default.
 *
 * After a successful verdict submission we collapse the row
 * optimistically; the next router.refresh() flips `reviewed` server-
 * side and the row stays collapsed via the same default rule.
 */
export function RunRow({ run, totalColumns }: Props) {
  const reviewable = run.status === 'succeeded';
  const failed = run.status === 'failed';
  // Compute the auto-expand default once at mount: succeeded-but-
  // unreviewed rows snap open so reviewers don't have to click each
  // one; failed rows snap open so the Gemini error is visible
  // inline. Subsequent user toggles win — including on rows whose
  // `reviewed` flag flips to true after a router.refresh, so people
  // can re-open a row to double-check what they just verdicted.
  const initialOpen = !run.reviewed && (reviewable || failed);
  const [open, setOpen] = useState(initialOpen);

  const reviewedLabel = run.reviewed ? (
    <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
      Yes
    </span>
  ) : failed ? (
    <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-red-200 ring-inset">
      Failed
    </span>
  ) : (
    <span className="bg-primary-50 text-primary-700 inline-flex items-center rounded-md px-2 py-1 text-xs font-medium">
      Pending
    </span>
  );

  return (
    <>
      <tr className="hover:bg-gray-50">
        <td className="px-4 py-2 text-sm">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded text-gray-500 hover:bg-gray-200"
            aria-expanded={open}
            aria-controls={`run-${run.id}-body`}
            aria-label={open ? 'Collapse row' : 'Expand row'}
          >
            <ChevronIcon open={open} />
          </button>
          <Link
            href={`/catalog-runs/${run.id}`}
            className="text-primary-700 font-mono hover:underline"
          >
            {run.id.slice(0, 8)}
          </Link>
          {run.jobId && (
            <div className="ml-7 text-xs text-gray-500">job {run.jobId.slice(0, 8)}</div>
          )}
        </td>
        <td className="px-4 py-2 text-sm text-gray-900">{run.scope}</td>
        <td className="px-4 py-2">
          {run.confidence ? (
            <DecisionBadge decision={run.confidence.decision} />
          ) : (
            <StatusBadge status={run.status} />
          )}
        </td>
        <td className="px-4 py-2">
          <ScoreCell value={run.confidence?.calibrated ?? null} />
        </td>
        <td className="px-4 py-2">
          <ScoreCell value={run.confidence?.raw ?? null} />
        </td>
        <td className="px-4 py-2 text-sm text-gray-700 tabular-nums">
          {formatLatency(run.latencyMs)}
        </td>
        <td className="px-4 py-2 text-sm text-gray-700">{formatDateTime(run.startedAt)}</td>
        <td className="px-4 py-2 text-xs">{reviewedLabel}</td>
      </tr>
      {open && (
        <tr id={`run-${run.id}-body`} className="bg-gray-50/50">
          <td colSpan={totalColumns} className="px-4 py-4">
            <RunBody run={run} onReviewed={() => setOpen(false)} reviewable={reviewable} />
          </td>
        </tr>
      )}
    </>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`transition-transform ${open ? 'rotate-90' : ''}`}
      aria-hidden="true"
    >
      <path
        d="M4 2L8 6L4 10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RunBody({
  run,
  reviewable,
  onReviewed,
}: {
  run: AdminRunSummary;
  reviewable: boolean;
  onReviewed: () => void;
}) {
  if (run.status === 'failed') {
    return (
      <div className="space-y-2">
        <h3 className="text-xs font-semibold tracking-wide text-red-800 uppercase">
          Generation failed
        </h3>
        {run.errorMessage ? (
          <pre className="overflow-x-auto rounded-md border border-red-200 bg-red-50 p-3 font-mono text-xs whitespace-pre-wrap text-red-900">
            {run.errorMessage}
          </pre>
        ) : (
          <p className="text-sm text-gray-600">No error message recorded for this run.</p>
        )}
        {run.sourceImageUrl && (
          <div className="mt-3">
            <ImageBlock label="Source" url={run.sourceImageUrl} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ImageBlock label="Source" url={run.sourceImageUrl} />
        {run.outputImageUrls.length === 0 ? (
          <ImageBlock label="Generated" url={null} note="Output URL not persisted for this run." />
        ) : (
          <div>
            <h4 className="text-xs font-semibold tracking-wide text-gray-600 uppercase">
              Generated ({run.outputImageUrls.length})
            </h4>
            <div className="mt-1 space-y-2">
              {run.outputImageUrls.map((url, i) => (
                <ImageBlock
                  key={url}
                  label={i === 0 ? 'Generated' : `Generated #${i + 1}`}
                  url={url}
                />
              ))}
            </div>
          </div>
        )}
      </div>
      {reviewable && !run.reviewed && <InlineReviewForm runId={run.id} onSubmitted={onReviewed} />}
    </div>
  );
}

function ImageBlock({ label, url, note }: { label: string; url: string | null; note?: string }) {
  const optimized = url ? withImageParams(url, 1024) : null;
  return (
    <div>
      <h4 className="text-xs font-semibold tracking-wide text-gray-600 uppercase">{label}</h4>
      {optimized ? (
        <a href={optimized} target="_blank" rel="noreferrer" className="mt-1 block">
          {/* Catalog images live on a public CDN; using <img> here keeps
              this component server-side rendering friendly without
              wiring up next/image's remotePatterns config. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={optimized}
            alt={label}
            loading="lazy"
            className="mt-1 max-h-72 w-full rounded-md border border-gray-200 bg-white object-contain"
          />
        </a>
      ) : (
        <div className="mt-1 flex h-32 items-center justify-center rounded-md border border-dashed border-gray-300 bg-white text-xs text-gray-500">
          {note ?? 'No image URL'}
        </div>
      )}
    </div>
  );
}

const VERDICTS: { value: HumanVerdict; label: string; tone: string }[] = [
  { value: 'accept', label: 'Pass', tone: 'bg-green-600 hover:bg-green-700' },
  { value: 'reject', label: 'Fail', tone: 'bg-red-600 hover:bg-red-700' },
];

/**
 * InlineReviewForm is the list-level twin of `/catalog-runs/[id]/review-form`.
 * It POSTs through the same Next proxy + admin endpoint so a single
 * audit chain accepts both surfaces. We collapse the accordion as
 * soon as the submit succeeds and call `router.refresh()` so the row
 * re-renders with `reviewed=true`.
 */
function InlineReviewForm({ runId, onSubmitted }: { runId: string; onSubmitted: () => void }) {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [verdict, setVerdict] = useState<HumanVerdict | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reviewerId = user?.primaryEmailAddress?.emailAddress ?? user?.id ?? '';

  const submit = async () => {
    if (!verdict || !reviewerId) {
      if (!reviewerId) setError('Could not resolve reviewer identity.');
      return;
    }
    setSubmitting(true);
    setError(null);
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
      onSubmitted();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-md border border-gray-200 bg-white p-3">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium tracking-wide text-gray-600 uppercase">
            Verdict
          </label>
          <div className="mt-1 flex flex-wrap gap-2">
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
        <div className="min-w-0 flex-1">
          <label className="block text-xs font-medium tracking-wide text-gray-600 uppercase">
            Notes (optional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What was right or wrong?"
            className="focus:border-primary-500 focus:ring-primary-500 mt-1 block w-full rounded-md border-gray-300 px-2 py-1.5 text-sm text-gray-900 shadow-xs"
          />
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={!verdict || submitting || !isLoaded}
          className="bg-primary-600 hover:bg-primary-700 disabled:bg-primary-300 inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white shadow-xs transition-colors"
        >
          {submitting ? 'Submitting…' : 'Submit'}
        </button>
      </div>
      {error && (
        <div className="mt-2 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-800">
          {error}
        </div>
      )}
      {reviewerId && <p className="mt-2 text-[11px] text-gray-500">Submitting as {reviewerId}</p>}
    </div>
  );
}
