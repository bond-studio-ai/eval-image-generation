import { AccuracyCell, formatDateTime } from '@/components/catalog-confidence/badges';
import type { JudgeBaselineStats, PromptVersion } from '@/lib/catalog-feed-client';
import Link from 'next/link';

interface Props {
  prompt: PromptVersion;
  liveStats: JudgeBaselineStats | null;
  liveError: string | null;
}

/**
 * BaselineSnapshotCard renders two columns of baseline accuracy:
 *   - Snapshot: stamped onto `prompt_versions.metadata` at the
 *     moment the most recent eval was run.
 *   - Live: rolled up from `judge_evaluations` joined against
 *     `judge_baseline_entries` for this prompt version.
 *
 * Only rendered for judge prompts. The component is server-side
 * because both inputs are already resolved by the page.
 */
export function BaselineSnapshotCard({ prompt, liveStats, liveError }: Props) {
  if (prompt.kind !== 'judge') return null;

  const snapshot = prompt.metadata;
  const hasSnapshot =
    snapshot.lastEvalOverall != null ||
    snapshot.lastBaselinePassRate != null ||
    snapshot.lastBaselineFailRate != null;

  return (
    <section className="mt-6 rounded-lg border border-gray-200 bg-white p-5 shadow-xs">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold tracking-wide text-gray-900 uppercase">
            Judge baseline accuracy
          </h2>
          <p className="mt-1 text-[11px] text-gray-500">
            Snapshot is the eval-time rollup the Promoter stamped on this row. Live is the rolling
            rollup over every judge run attributed to this prompt version against the labeled set
            for{' '}
            <Link
              href={`/judge-baselines/${encodeURIComponent(prompt.scope)}`}
              className="text-primary-600 hover:text-primary-500"
            >
              {prompt.scope}
            </Link>
            .
          </p>
        </div>
      </header>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-md border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold tracking-wide text-gray-700 uppercase">
              Snapshot (last eval)
            </h3>
            {snapshot.lastEvaluatedAt && (
              <span className="text-[11px] text-gray-500">
                {formatDateTime(snapshot.lastEvaluatedAt)}
              </span>
            )}
          </div>
          {hasSnapshot ? (
            <dl className="mt-3 space-y-2 text-sm">
              <Row
                label="OpenAI Evals"
                value={
                  <span className="text-gray-900 tabular-nums">
                    {snapshot.lastEvalOverall != null ? snapshot.lastEvalOverall.toFixed(3) : '—'}
                  </span>
                }
              />
              <Row
                label="Pass rate"
                value={
                  <AccuracyCell
                    value={snapshot.lastBaselinePassRate ?? null}
                    sample={snapshot.lastBaselineSample ?? null}
                  />
                }
              />
              <Row
                label="Fail rate"
                value={
                  <AccuracyCell
                    value={snapshot.lastBaselineFailRate ?? null}
                    sample={snapshot.lastBaselineSample ?? null}
                  />
                }
              />
              <Row
                label="Mismatches"
                value={
                  <span className="text-gray-900 tabular-nums">
                    {snapshot.lastBaselineMismatchCount ?? '—'}
                  </span>
                }
              />
            </dl>
          ) : (
            <p className="mt-3 text-xs text-gray-500">
              No eval has run against this prompt version yet. The snapshot lands here once the
              Promoter records the next eval row.
            </p>
          )}
        </div>

        <div className="rounded-md border border-gray-200 p-4">
          <h3 className="text-xs font-semibold tracking-wide text-gray-700 uppercase">
            Live (rolling)
          </h3>
          {liveError ? (
            <p className="mt-3 text-xs text-red-700">Could not load live stats: {liveError}</p>
          ) : !liveStats || liveStats.sample === 0 ? (
            <p className="mt-3 text-xs text-gray-500">
              No labeled judge runs recorded yet for this prompt version.
            </p>
          ) : (
            <dl className="mt-3 space-y-2 text-sm">
              <Row
                label="Pass rate"
                value={<AccuracyCell value={liveStats.passRate} sample={liveStats.passTotal} />}
              />
              <Row
                label="Fail rate"
                value={<AccuracyCell value={liveStats.failRate} sample={liveStats.failTotal} />}
              />
              <Row
                label="Total labeled runs"
                value={<span className="text-gray-900 tabular-nums">{liveStats.sample}</span>}
              />
            </dl>
          )}
        </div>
      </div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-[11px] tracking-wide text-gray-500 uppercase">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}
