import { PageHeader } from '@/components/page-header';
import { fetchAdminThreshold } from '@/lib/catalog-feed-client';
import { ThresholdEditor } from './threshold-editor';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ scope?: string }>;
}

/**
 * Thresholds are per-scope. The UI forces the reviewer to pick a scope
 * first (via ?scope=tear_sheet) so that edits always target an
 * explicit key rather than a generic default that would silently apply
 * everywhere. Empty-scope state surfaces a helper describing the
 * contract.
 */
export default async function CatalogThresholdsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const scope = (sp.scope ?? '').trim();

  return (
    <div>
      <PageHeader
        title="Catalog Confidence — Thresholds"
        subtitle={
          <>
            Per-scope routing thresholds that map calibrated confidence to the auto-ship /
            spot-check / hold lanes. The service enforces
            <code className="mx-1 rounded bg-gray-100 px-1 py-0.5 text-[11px]">
              autoShipMin &gt; holdMax
            </code>
            so the two lanes never overlap.
          </>
        }
      />

      <form
        method="get"
        className="mt-6 flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-xs"
      >
        <label className="text-xs font-medium text-gray-600">
          Scope
          <input
            name="scope"
            defaultValue={scope}
            placeholder="tear_sheet, line_drawing, procedural_extraction…"
            className="focus:border-primary-500 focus:ring-primary-500 mt-1 w-80 rounded-md border-gray-300 px-2 py-1 text-sm text-gray-900 shadow-xs"
          />
        </label>
        <button
          type="submit"
          className="bg-primary-600 hover:bg-primary-700 rounded-md px-3 py-1.5 text-sm font-medium text-white shadow-xs"
        >
          Load
        </button>
      </form>

      {scope ? (
        <ScopePanel scope={scope} />
      ) : (
        <div className="mt-6 rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          Pick a scope (e.g.{' '}
          <code className="rounded bg-white px-1 py-0.5 text-xs">tear_sheet</code>) and click Load
          to view or edit its thresholds.
        </div>
      )}
    </div>
  );
}

async function ScopePanel({ scope }: { scope: string }) {
  // Resolve the threshold up front and surface load failures through a
  // plain variable, matching the run-detail page. Throwing inside JSX
  // trips React's error-boundary rule; this approach keeps the render
  // tree safe while still giving the reviewer a useful error message.
  let threshold: Awaited<ReturnType<typeof fetchAdminThreshold>> | null = null;
  let error: string | null = null;
  try {
    threshold = await fetchAdminThreshold(scope);
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  if (error || !threshold) {
    return (
      <div className="mt-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        Failed to load threshold for <code className="font-mono">{scope}</code>:{' '}
        {error ?? 'unknown error'}
      </div>
    );
  }
  return (
    <div className="mt-6">
      <ThresholdEditor initial={threshold} />
    </div>
  );
}
