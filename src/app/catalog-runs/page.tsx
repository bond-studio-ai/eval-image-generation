import { PageHeader } from '@/components/page-header';
import {
  fetchAdminRuns,
  type ListRunsParams,
  type RoutingDecision,
} from '@/lib/catalog-feed-client';
import Link from 'next/link';
import { ClearRunsButton } from './clear-runs-button';
import { RunRow } from './run-row';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{
    scope?: string;
    decision?: string;
    minScore?: string;
    maxScore?: string;
    since?: string;
    before?: string;
    reviewed?: string;
    page?: string;
  }>;
}

const PAGE_SIZE = 50;

const DECISION_OPTIONS: { value: RoutingDecision | ''; label: string }[] = [
  { value: '', label: 'All decisions' },
  { value: 'hold_for_review', label: 'Hold for review' },
  { value: 'spot_check', label: 'Spot-check' },
  { value: 'auto_ship', label: 'Auto-ship' },
];

const REVIEWED_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All runs' },
  { value: 'false', label: 'Unreviewed only' },
  { value: 'true', label: 'Reviewed only' },
];

function toNumber(v: string | undefined): number | undefined {
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

// collectUnsupportedClearFilters returns the page-level filters that
// have NO equivalent on the backend's `DELETE /admin/runs` filter
// surface (`scope`, `status`, `since`, `before` are honoured; the
// rest are not). Surfacing the names back to the operator via the
// confirm-clear copy was the right call from PR #26 review P1: a
// reviewer working a `decision=hold` queue must be told their
// score/decision filter will NOT narrow the destructive call so
// they can either widen the table view first or cancel the clear.
function collectUnsupportedClearFilters(sp: {
  decision?: string;
  minScore?: string;
  maxScore?: string;
  reviewed?: string;
}): string[] {
  const out: string[] = [];
  if (sp.decision) out.push(`decision=${sp.decision}`);
  if (sp.minScore) out.push(`minScore=${sp.minScore}`);
  if (sp.maxScore) out.push(`maxScore=${sp.maxScore}`);
  if (sp.reviewed) out.push(`reviewed=${sp.reviewed}`);
  return out;
}

function parseReviewed(raw: string | undefined): boolean | undefined {
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return undefined;
}

export default async function CatalogRunsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const page = Math.max(1, Number.parseInt(sp.page ?? '1', 10) || 1);
  const params: ListRunsParams = {
    scope: sp.scope || undefined,
    decision: (sp.decision as RoutingDecision) || '',
    minScore: toNumber(sp.minScore),
    maxScore: toNumber(sp.maxScore),
    since: sp.since || undefined,
    before: sp.before || undefined,
    reviewed: parseReviewed(sp.reviewed),
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  };

  let runs: Awaited<ReturnType<typeof fetchAdminRuns>> = [];
  let error: string | null = null;
  try {
    runs = await fetchAdminRuns(params);
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  return (
    <div>
      <PageHeader
        title="Catalog Confidence — Review Queue"
        subtitle="Calibrated AI generation runs from the catalog-feed service. Sort the default view by decision=Hold to work the reviewer queue top-down; Spot-check rows surface the 5% sampled approvals that earn reviewer time."
      />

      <div className="mt-4 flex justify-end">
        <ClearRunsButton
          scope={sp.scope}
          since={sp.since}
          before={sp.before}
          unsupportedFilters={collectUnsupportedClearFilters(sp)}
        />
      </div>

      <form
        method="get"
        className="mt-6 grid grid-cols-2 gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-xs md:grid-cols-7"
      >
        <label className="text-xs font-medium text-gray-600">
          Scope
          <input
            name="scope"
            defaultValue={sp.scope ?? ''}
            placeholder="tear_sheet, line_drawing…"
            className="focus:border-primary-500 focus:ring-primary-500 mt-1 w-full rounded-md border-gray-300 px-2 py-1 text-sm text-gray-900 shadow-xs"
          />
        </label>
        <label className="text-xs font-medium text-gray-600">
          Decision
          <select
            name="decision"
            defaultValue={sp.decision ?? ''}
            className="focus:border-primary-500 focus:ring-primary-500 mt-1 w-full rounded-md border-gray-300 px-2 py-1 text-sm text-gray-900 shadow-xs"
          >
            {DECISION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-gray-600">
          Min score
          <input
            name="minScore"
            type="number"
            step="0.01"
            min="0"
            max="1"
            defaultValue={sp.minScore ?? ''}
            placeholder="0.00"
            className="focus:border-primary-500 focus:ring-primary-500 mt-1 w-full rounded-md border-gray-300 px-2 py-1 text-sm text-gray-900 shadow-xs"
          />
        </label>
        <label className="text-xs font-medium text-gray-600">
          Max score
          <input
            name="maxScore"
            type="number"
            step="0.01"
            min="0"
            max="1"
            defaultValue={sp.maxScore ?? ''}
            placeholder="1.00"
            className="focus:border-primary-500 focus:ring-primary-500 mt-1 w-full rounded-md border-gray-300 px-2 py-1 text-sm text-gray-900 shadow-xs"
          />
        </label>
        <label className="text-xs font-medium text-gray-600">
          Human reviewed
          <select
            name="reviewed"
            defaultValue={sp.reviewed ?? ''}
            className="focus:border-primary-500 focus:ring-primary-500 mt-1 w-full rounded-md border-gray-300 px-2 py-1 text-sm text-gray-900 shadow-xs"
          >
            {REVIEWED_OPTIONS.map((o) => (
              <option key={o.value || 'all'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-gray-600">
          Since (RFC3339)
          <input
            name="since"
            defaultValue={sp.since ?? ''}
            placeholder="2026-04-01T00:00:00Z"
            className="focus:border-primary-500 focus:ring-primary-500 mt-1 w-full rounded-md border-gray-300 px-2 py-1 text-sm text-gray-900 shadow-xs"
          />
        </label>
        <div className="flex items-end">
          <button
            type="submit"
            className="bg-primary-600 hover:bg-primary-700 w-full rounded-md px-3 py-1.5 text-sm font-medium text-white shadow-xs"
          >
            Apply
          </button>
        </div>
      </form>

      {error && (
        <div className="mt-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Failed to load runs: {error}
        </div>
      )}

      <div className="mt-6 overflow-clip rounded-lg border border-gray-200 bg-white shadow-xs">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-600 uppercase">
                Run
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-600 uppercase">
                Scope
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-600 uppercase">
                Decision
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-600 uppercase">
                Calibrated
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-600 uppercase">
                Raw
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-600 uppercase">
                Latency
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-600 uppercase">
                Started
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-600 uppercase">
                Reviewed
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {runs.length === 0 && !error && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-500">
                  No runs match the current filters.
                </td>
              </tr>
            )}
            {runs.map((r) => (
              <RunRow key={r.id} run={r} totalColumns={8} />
            ))}
          </tbody>
        </table>
      </div>

      <PaginationBar page={page} hasNext={runs.length === PAGE_SIZE} searchParams={sp} />
    </div>
  );
}

function PaginationBar({
  page,
  hasNext,
  searchParams,
}: {
  page: number;
  hasNext: boolean;
  searchParams: Record<string, string | undefined>;
}) {
  const buildHref = (nextPage: number) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) {
      if (v && k !== 'page') params.set(k, v);
    }
    if (nextPage > 1) params.set('page', String(nextPage));
    const qs = params.toString();
    return `/catalog-runs${qs ? `?${qs}` : ''}`;
  };
  return (
    <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
      <span>Page {page}</span>
      <div className="flex gap-2">
        <Link
          href={buildHref(Math.max(1, page - 1))}
          className={`rounded-md border px-3 py-1 ${page === 1 ? 'pointer-events-none border-gray-200 text-gray-400' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
          aria-disabled={page === 1}
        >
          Previous
        </Link>
        <Link
          href={buildHref(page + 1)}
          className={`rounded-md border px-3 py-1 ${hasNext ? 'border-gray-300 text-gray-700 hover:bg-gray-50' : 'pointer-events-none border-gray-200 text-gray-400'}`}
          aria-disabled={!hasNext}
        >
          Next
        </Link>
      </div>
    </div>
  );
}
