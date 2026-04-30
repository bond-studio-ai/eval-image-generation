import {
  BaselineMatchBadge,
  DecisionBadge,
  formatDateTime,
  formatLatency,
  ScoreCell,
  VerdictBadge,
} from '@/components/catalog-confidence/badges';
import { PageHeader } from '@/components/page-header';
import { fetchAdminRun } from '@/lib/catalog-feed-client';
import { ReviewForm } from './review-form';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CatalogRunDetailPage({ params }: PageProps) {
  const { id } = await params;
  // We resolve the data up front so that rendering never sees a
  // throwable promise: React explicitly disallows constructing JSX
  // inside try/catch because the errors would escape the render
  // pipeline. Capturing the error into a variable keeps the UI tree
  // error-safe and still shows a friendly not-found surface.
  let detail: Awaited<ReturnType<typeof fetchAdminRun>> | null = null;
  let loadError: string | null = null;
  try {
    detail = await fetchAdminRun(id);
  } catch (e) {
    loadError = e instanceof Error ? e.message : String(e);
  }

  if (!detail) {
    return (
      <div>
        <PageHeader title="Run not found" backHref="/catalog-runs" backLabel="Review queue" />
        <div className="mt-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {loadError ?? 'Run not found'}
        </div>
      </div>
    );
  }

  const run = detail.run;
  const showReview = run.status === 'succeeded';
  return (
    <div>
      <PageHeader
        title={`Run ${run.id.slice(0, 8)}`}
        subtitle={`${run.scope} · ${run.modelVendor || 'unknown'} / ${run.modelName || 'unknown'}`}
        backHref="/catalog-runs"
        backLabel="Review queue"
      />

      {run.status === 'failed' && run.errorMessage && (
        <section className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 shadow-xs">
          <h2 className="text-sm font-semibold tracking-wide text-red-800 uppercase">
            Generation failed
          </h2>
          <pre className="mt-2 overflow-x-auto rounded-md border border-red-200 bg-white p-3 font-mono text-xs whitespace-pre-wrap text-red-900">
            {run.errorMessage}
          </pre>
        </section>
      )}

      <section className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
        <h2 className="text-sm font-semibold tracking-wide text-gray-600 uppercase">
          Input vs output
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <DetailImage label="Source" url={run.sourceImageUrl} />
          {run.outputImageUrls.length === 0 ? (
            <DetailImage
              label="Generated"
              url={null}
              note="Output URL not persisted for this run."
            />
          ) : (
            <div>
              <h3 className="text-xs font-semibold tracking-wide text-gray-600 uppercase">
                Generated ({run.outputImageUrls.length})
              </h3>
              <div className="mt-1 space-y-2">
                {run.outputImageUrls.map((url, i) => (
                  <DetailImage
                    key={url}
                    label={i === 0 ? 'Generated' : `Generated #${i + 1}`}
                    url={url}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
          <h2 className="text-sm font-semibold tracking-wide text-gray-600 uppercase">Outcome</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <Field label="Status" value={run.status} />
            <Field label="Started" value={formatDateTime(run.startedAt)} />
            <Field label="Finished" value={formatDateTime(run.finishedAt)} />
            <Field label="Latency" value={formatLatency(run.latencyMs)} />
            <Field
              label="Decision"
              value={run.confidence ? <DecisionBadge decision={run.confidence.decision} /> : '—'}
            />
            <Field
              label="Calibrated"
              value={<ScoreCell value={run.confidence?.calibrated ?? null} />}
            />
            <Field label="Raw" value={<ScoreCell value={run.confidence?.raw ?? null} />} />
          </dl>
        </section>

        {showReview ? (
          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-xs lg:col-span-2">
            <h2 className="text-sm font-semibold tracking-wide text-gray-600 uppercase">
              Submit human review
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Verdicts feed the nightly isotonic calibration and the Evals prompt-promotion gate.
            </p>
            {detail.humanReviews.length > 0 && (
              <div className="mt-3 rounded-md border border-yellow-200 bg-yellow-50 p-3 text-xs text-yellow-800">
                This run has been reviewed {detail.humanReviews.length} time(s). A new verdict adds
                to the audit chain rather than replacing the previous one.
              </div>
            )}
            <ReviewForm runId={run.id} />
          </section>
        ) : (
          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-xs lg:col-span-2">
            <h2 className="text-sm font-semibold tracking-wide text-gray-600 uppercase">
              Review unavailable
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Reviews can only be filed against runs whose generation succeeded. This run finished
              with status <code className="rounded bg-gray-100 px-1 text-xs">{run.status}</code>;
              fix the upstream failure and rerun before recording a verdict.
            </p>
          </section>
        )}
      </div>

      <section className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
        <h2 className="text-sm font-semibold tracking-wide text-gray-600 uppercase">
          Ensemble judges ({detail.judgeEvaluations.length})
        </h2>
        {detail.judgeEvaluations.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">No judge evaluations recorded.</p>
        ) : (
          <div className="mt-3 overflow-clip rounded-md border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium tracking-wider text-gray-600 uppercase">
                    Role
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium tracking-wider text-gray-600 uppercase">
                    Model
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium tracking-wider text-gray-600 uppercase">
                    Verdict
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium tracking-wider text-gray-600 uppercase">
                    Baseline
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium tracking-wider text-gray-600 uppercase">
                    Scores
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium tracking-wider text-gray-600 uppercase">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {detail.judgeEvaluations.map((j) => (
                  <tr key={j.id}>
                    <td className="px-3 py-2 text-sm text-gray-900">{j.role}</td>
                    <td className="px-3 py-2 text-sm text-gray-700">
                      {j.modelVendor}/{j.modelName}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-700">{j.rawVerdict ?? '—'}</td>
                    <td className="px-3 py-2 text-xs">
                      <BaselineMatchBadge
                        match={j.baselineMatch}
                        expected={j.baselineExpected}
                        observedPass={j.baselineObservedPass}
                      />
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-600">
                      {j.scores ? (
                        <code className="rounded bg-gray-50 px-1.5 py-0.5 font-mono text-xs text-gray-700">
                          {JSON.stringify(j.scores)}
                        </code>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-700">{j.notes ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
        <h2 className="text-sm font-semibold tracking-wide text-gray-600 uppercase">
          Deterministic checks ({detail.deterministicChecks.length})
        </h2>
        {detail.deterministicChecks.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">No deterministic checks recorded.</p>
        ) : (
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            {detail.deterministicChecks.map((c) => (
              <div
                key={c.id}
                className={`rounded-md border p-3 text-sm ${c.passed ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">{c.kind}</span>
                  <span className={c.passed ? 'text-green-800' : 'text-red-800'}>
                    {c.passed ? 'pass' : 'fail'}
                    {c.score != null && ` · ${c.score.toFixed(3)}`}
                  </span>
                </div>
                {c.details && (
                  <pre className="mt-2 overflow-x-auto rounded bg-white/60 p-2 text-xs text-gray-700">
                    {JSON.stringify(c.details, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
        <h2 className="text-sm font-semibold tracking-wide text-gray-600 uppercase">
          Human reviews ({detail.humanReviews.length})
        </h2>
        {detail.humanReviews.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">No human reviews yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {detail.humanReviews.map((h) => (
              <li key={h.id} className="rounded-md border border-gray-200 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <VerdictBadge verdict={h.verdict} />
                    <span className="text-gray-600">by {h.reviewerId}</span>
                  </div>
                  <span className="text-xs text-gray-500">{formatDateTime(h.createdAt)}</span>
                </div>
                {h.notes && <p className="mt-2 text-sm text-gray-700">{h.notes}</p>}
                {h.perCriterionFlags && Object.keys(h.perCriterionFlags).length > 0 && (
                  <pre className="mt-2 overflow-x-auto rounded bg-gray-50 p-2 text-xs text-gray-700">
                    {JSON.stringify(h.perCriterionFlags, null, 2)}
                  </pre>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {run.promptTemplate && (
        <section className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
          <h2 className="text-sm font-semibold tracking-wide text-gray-600 uppercase">
            Prompt template (at run time)
          </h2>
          <pre className="mt-3 max-h-96 overflow-auto rounded bg-gray-50 p-3 text-xs text-gray-800">
            {run.promptTemplate}
          </pre>
        </section>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-xs tracking-wide text-gray-500 uppercase">{label}</dt>
      <dd className="text-sm text-gray-900">{value}</dd>
    </div>
  );
}

/**
 * DetailImage mirrors the runs-list `ImageBlock` so reviewers see the
 * same comparison surface whether they're scrolling the queue or
 * inspecting a single run. We use a plain `<img>` instead of next/image
 * because the catalog CDN is on a separate hostname; configuring
 * remotePatterns adds friction with no perceptible UX gain at the
 * sizes we render here.
 */
function DetailImage({ label, url, note }: { label: string; url: string | null; note?: string }) {
  return (
    <div>
      <h3 className="text-xs font-semibold tracking-wide text-gray-600 uppercase">{label}</h3>
      {url ? (
        <a href={url} target="_blank" rel="noreferrer" className="mt-1 block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={label}
            loading="lazy"
            className="mt-1 max-h-96 w-full rounded-md border border-gray-200 bg-white object-contain"
          />
        </a>
      ) : (
        <div className="mt-1 flex h-40 items-center justify-center rounded-md border border-dashed border-gray-300 bg-white text-xs text-gray-500">
          {note ?? 'No image URL'}
        </div>
      )}
    </div>
  );
}
