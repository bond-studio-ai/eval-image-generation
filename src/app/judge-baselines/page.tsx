import { AccuracyCell, formatDateTime } from '@/components/catalog-confidence/badges';
import { PageHeader } from '@/components/page-header';
import {
  fetchAdminPrompts,
  fetchJudgeBaselineScopes,
  type JudgeBaselineScopeStat,
  type PromptVersion,
} from '@/lib/catalog-feed-client';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

/**
 * JudgeBaselinesIndex lists every scope that has either a labeled
 * baseline or a registered judge prompt — the union of the two
 * sources. The previous version keyed off prompts only, which
 * silently hid scopes that had been seeded with baselines but did
 * not yet have a judge prompt registered (the typical state right
 * after running `seed-judge-baselines`). The new version pulls from
 * `/admin/judge-baselines` for the baseline-driven row set and
 * merges in `/admin/prompts?kind=judge` so prompt-only scopes
 * (a fresh judge prompt with no labels yet) still surface as a
 * "go label me" entry point.
 *
 * Each row is enriched with the active judge prompt's snapshot
 * stats when one exists. Scopes without a registered judge prompt
 * still render with em-dashes in the rate columns and "no prompt
 * yet" in the prompt column; scopes without baselines render with
 * "0 pass / 0 fail" so the labeling gap is explicit. Both sides of
 * the gap are addressable directly from the row, which is the
 * point of the union.
 *
 * Both fetches run in parallel because the index is `force-dynamic`
 * and re-runs on every request; serializing them would double the
 * page's TTFB for no upside.
 */
export default async function JudgeBaselinesIndexPage() {
  // The two sources fail independently: one endpoint going down
  // (404 during a backend rollout window, 5xx from a flapping
  // service, etc.) MUST NOT drop the rows the other source still
  // returns. A bare `Promise.all` would do exactly that — a 404 on
  // the new `/admin/judge-baselines` would empty the whole page
  // even when `/admin/prompts?kind=judge` is healthy, blocking
  // operator navigation to prompt-backed scopes that the previous
  // version of this page rendered fine. Settling each promise
  // separately lets the page render whichever source is up and
  // surface a per-source banner for the one that isn't.
  const [scopesResult, promptsResult] = await Promise.allSettled([
    fetchJudgeBaselineScopes(),
    fetchAdminPrompts({ kind: 'judge' }),
  ]);
  const scopes: JudgeBaselineScopeStat[] =
    scopesResult.status === 'fulfilled' ? scopesResult.value : [];
  const prompts: PromptVersion[] = promptsResult.status === 'fulfilled' ? promptsResult.value : [];
  const scopesError =
    scopesResult.status === 'rejected' ? formatRejection(scopesResult.reason) : null;
  const promptsError =
    promptsResult.status === 'rejected' ? formatRejection(promptsResult.reason) : null;

  // Build a per-scope index of judge prompts so we can attach the
  // active prompt's snapshot to the corresponding baseline row in
  // O(1). Falls back to the most-recently-created proposal so brand-
  // new scopes still link somewhere when promotion has not happened
  // yet.
  const promptByScope = new Map<string, PromptVersion>();
  for (const p of prompts) {
    const existing = promptByScope.get(p.scope);
    if (!existing) {
      promptByScope.set(p.scope, p);
      continue;
    }
    if (existing.status !== 'active' && p.status === 'active') {
      promptByScope.set(p.scope, p);
    } else if (existing.status === p.status && p.createdAt > existing.createdAt) {
      promptByScope.set(p.scope, p);
    }
  }

  // Union the two sources by scope. We iterate baselines first so
  // their counts stick, then layer in any prompt-only scopes that
  // didn't appear in the baseline rollup (rendered with 0/0).
  const statsByScope = new Map<string, JudgeBaselineScopeStat>();
  for (const stat of scopes) statsByScope.set(stat.scope, stat);
  for (const scope of promptByScope.keys()) {
    if (!statsByScope.has(scope)) {
      statsByScope.set(scope, { scope, passCount: 0, failCount: 0, lastUpdatedAt: null });
    }
  }
  const rows = Array.from(statsByScope.values())
    .sort((a, b) => a.scope.localeCompare(b.scope))
    .map((stat) => ({ stat, prompt: promptByScope.get(stat.scope) ?? null }));

  return (
    <div>
      <PageHeader
        title="Judge Baselines"
        subtitle="Per-scope curated pass/fail product-ID baselines. The worker captures match telemetry on every primary judge call; the Promoter gates promotion of proposed judge prompts on these labeled sets. Scopes appear here as soon as a baseline is labeled, even before a judge prompt is registered."
      />

      {scopesError && (
        <div className="mt-6 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Could not load baseline scopes; rows below show only scopes that have a registered judge
          prompt. Pass/fail counts will be missing until this recovers. ({scopesError})
        </div>
      )}
      {promptsError && (
        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Could not load judge prompts; rows below show only scopes with labeled baselines. Active
          prompt links and accuracy snapshots are unavailable until this recovers. ({promptsError})
        </div>
      )}

      <div className="mt-6 overflow-clip rounded-md border border-gray-200 bg-white shadow-xs">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <Th>Scope</Th>
              <Th>Labeled</Th>
              <Th>Last pass rate</Th>
              <Th>Last fail rate</Th>
              <Th>Last evaluated</Th>
              <Th>Active prompt</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.length === 0 && !scopesError && !promptsError ? (
              <tr>
                <td className="px-4 py-6 text-center text-sm text-gray-500" colSpan={6}>
                  No baselines or judge prompts yet. Bulk-paste from the per-scope editor or run the
                  seed-judge-baselines CLI from the catalog-feed repo.
                </td>
              </tr>
            ) : (
              rows.map(({ stat, prompt }) => (
                <tr key={stat.scope} className="hover:bg-gray-50">
                  <td className="px-4 py-2 align-top">
                    <Link
                      href={`/judge-baselines/${encodeURIComponent(stat.scope)}`}
                      className="text-primary-600 hover:text-primary-500 font-mono text-xs"
                    >
                      {stat.scope}
                    </Link>
                  </td>
                  <td className="px-4 py-2 align-top">
                    <LabeledCell pass={stat.passCount} fail={stat.failCount} />
                  </td>
                  <td className="px-4 py-2 align-top">
                    <AccuracyCell
                      value={prompt?.metadata.lastBaselinePassRate ?? null}
                      sample={prompt?.metadata.lastBaselineSample ?? null}
                    />
                  </td>
                  <td className="px-4 py-2 align-top">
                    <AccuracyCell
                      value={prompt?.metadata.lastBaselineFailRate ?? null}
                      sample={prompt?.metadata.lastBaselineSample ?? null}
                    />
                  </td>
                  <td className="px-4 py-2 align-top text-xs text-gray-700">
                    {formatDateTime(prompt?.metadata.lastEvaluatedAt ?? null)}
                  </td>
                  <td className="px-4 py-2 align-top">
                    {prompt ? (
                      <Link
                        href={`/catalog-prompts/${prompt.id}`}
                        className="text-primary-600 hover:text-primary-500 text-xs"
                      >
                        {prompt.status} · {formatDateTime(prompt.activatedAt ?? prompt.createdAt)}
                      </Link>
                    ) : (
                      <span className="text-xs text-gray-400">no prompt yet</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-2 text-left text-[10px] font-semibold tracking-wider text-gray-600 uppercase">
      {children}
    </th>
  );
}

/**
 * formatRejection renders a Promise rejection reason as a short
 * human-readable string for the per-source banner. Banner space is
 * tight so we only surface the message; the full stack lives in
 * server logs (Next.js prints rejected Server Component fetches by
 * default). Any non-Error value is stringified verbatim — partial
 * outages from the proxy can throw plain strings or objects.
 */
function formatRejection(reason: unknown): string {
  if (reason instanceof Error) return reason.message;
  if (typeof reason === 'string') return reason;
  try {
    return JSON.stringify(reason);
  } catch {
    return String(reason);
  }
}

/**
 * LabeledCell shows the pass/fail counts as separate badges so a
 * reviewer can spot at a glance whether a scope is balanced enough
 * for the Promoter's rate thresholds to be statistically meaningful.
 * The Promoter gates pass-rate only when `passCount > 0` and
 * fail-rate only when `failCount > 0`, so a 0 on either side is the
 * noteworthy case the badge highlights with a muted (but still
 * accessible) color: gray-600 text on gray-50 plus a thin gray-200
 * ring clears WCAG AA for small text and stays visually secondary
 * to the colored populated badges.
 */
function LabeledCell({ pass, fail }: { pass: number; fail: number }) {
  const emptyClass = 'bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-200';
  const passClass = pass > 0 ? 'bg-green-50 text-green-800' : emptyClass;
  const failClass = fail > 0 ? 'bg-red-50 text-red-800' : emptyClass;
  return (
    <div className="flex items-center gap-2 text-xs tabular-nums">
      <span
        className={`inline-flex items-center rounded-md px-2 py-0.5 font-medium ${passClass}`}
        title={`${pass} should pass`}
      >
        {pass} pass
      </span>
      <span
        className={`inline-flex items-center rounded-md px-2 py-0.5 font-medium ${failClass}`}
        title={`${fail} should fail`}
      >
        {fail} fail
      </span>
    </div>
  );
}
