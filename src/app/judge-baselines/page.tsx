import { AccuracyCell, formatDateTime } from '@/components/catalog-confidence/badges';
import { PageHeader } from '@/components/page-header';
import { fetchAdminPrompts, type PromptVersion } from '@/lib/catalog-feed-client';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

/**
 * JudgeBaselinesIndex lists every known judge scope so operators can
 * jump into the per-scope editor without typing the URL. We derive
 * the scope set from the canonical `/admin/prompts?kind=judge` list:
 * baselines are keyed by judge scope, and a scope only matters if a
 * judge prompt exists for it. Each row also surfaces the snapshot
 * stats stamped on the active prompt's metadata so reviewers can
 * spot regressions before drilling in.
 */
export default async function JudgeBaselinesIndexPage() {
  let prompts: PromptVersion[] = [];
  let loadError: string | null = null;
  try {
    prompts = await fetchAdminPrompts({ kind: 'judge' });
  } catch (e) {
    loadError = e instanceof Error ? e.message : String(e);
  }

  // Roll up to one row per scope using the active prompt's snapshot
  // when one exists, falling back to the most recently created
  // proposal so brand-new scopes still render.
  const byScope = new Map<string, PromptVersion>();
  for (const p of prompts) {
    const existing = byScope.get(p.scope);
    if (!existing) {
      byScope.set(p.scope, p);
      continue;
    }
    if (existing.status !== 'active' && p.status === 'active') {
      byScope.set(p.scope, p);
    } else if (existing.status === p.status && p.createdAt > existing.createdAt) {
      byScope.set(p.scope, p);
    }
  }
  const rows = Array.from(byScope.values()).sort((a, b) => a.scope.localeCompare(b.scope));

  return (
    <div>
      <PageHeader
        title="Judge Baselines"
        subtitle="Per-scope curated pass/fail product-ID baselines. The worker captures match telemetry on every primary judge call; the Promoter gates promotion of proposed judge prompts on these labeled sets."
      />

      {loadError && (
        <div className="mt-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Failed to load judge prompts: {loadError}
        </div>
      )}

      <div className="mt-6 overflow-clip rounded-md border border-gray-200 bg-white shadow-xs">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-[10px] font-semibold tracking-wider text-gray-600 uppercase">
                Scope
              </th>
              <th className="px-4 py-2 text-left text-[10px] font-semibold tracking-wider text-gray-600 uppercase">
                Last pass rate
              </th>
              <th className="px-4 py-2 text-left text-[10px] font-semibold tracking-wider text-gray-600 uppercase">
                Last fail rate
              </th>
              <th className="px-4 py-2 text-left text-[10px] font-semibold tracking-wider text-gray-600 uppercase">
                Last evaluated
              </th>
              <th className="px-4 py-2 text-left text-[10px] font-semibold tracking-wider text-gray-600 uppercase">
                Active prompt
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.length === 0 && !loadError ? (
              <tr>
                <td className="px-4 py-6 text-center text-sm text-gray-500" colSpan={5}>
                  No judge prompts yet. Once the worker seeds a judge prompt for a scope, it shows
                  up here.
                </td>
              </tr>
            ) : (
              rows.map((p) => (
                <tr key={p.scope} className="hover:bg-gray-50">
                  <td className="px-4 py-2 align-top">
                    <Link
                      href={`/judge-baselines/${encodeURIComponent(p.scope)}`}
                      className="text-primary-600 hover:text-primary-500 font-mono text-xs"
                    >
                      {p.scope}
                    </Link>
                  </td>
                  <td className="px-4 py-2 align-top">
                    <AccuracyCell
                      value={p.metadata.lastBaselinePassRate ?? null}
                      sample={p.metadata.lastBaselineSample ?? null}
                    />
                  </td>
                  <td className="px-4 py-2 align-top">
                    <AccuracyCell
                      value={p.metadata.lastBaselineFailRate ?? null}
                      sample={p.metadata.lastBaselineSample ?? null}
                    />
                  </td>
                  <td className="px-4 py-2 align-top text-xs text-gray-700">
                    {formatDateTime(p.metadata.lastEvaluatedAt ?? null)}
                  </td>
                  <td className="px-4 py-2 align-top">
                    <Link
                      href={`/catalog-prompts/${p.id}`}
                      className="text-primary-600 hover:text-primary-500 text-xs"
                    >
                      {p.status} · {formatDateTime(p.activatedAt ?? p.createdAt)}
                    </Link>
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
