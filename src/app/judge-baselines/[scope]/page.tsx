import { JudgeBaselineEditor } from '@/components/judge-baselines/judge-baseline-editor';
import { PageHeader } from '@/components/page-header';
import { fetchJudgeBaselineEntries, type JudgeBaselineEntry } from '@/lib/catalog-feed-client';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ scope: string }>;
}

/**
 * Per-scope baseline editor. The scope segment is URL-encoded by the
 * caller (so `vanities:tear_sheet` arrives as `vanities%3Atear_sheet`)
 * and passed through verbatim to the upstream service. Errors are
 * captured into a variable so the route renders a friendly surface
 * instead of escaping into the route error boundary on transient
 * proxy/auth failures.
 */
export default async function JudgeBaselineScopePage({ params }: PageProps) {
  const { scope: rawScope } = await params;
  const scope = decodeURIComponent(rawScope);
  let entries: JudgeBaselineEntry[] = [];
  let loadError: string | null = null;
  try {
    entries = await fetchJudgeBaselineEntries(scope);
  } catch (e) {
    loadError = e instanceof Error ? e.message : String(e);
  }

  return (
    <div>
      <PageHeader
        backHref="/judge-baselines"
        backLabel="All baselines"
        title={`Judge baseline · ${scope}`}
        subtitle={
          <>
            Curated <code>(productId, expected)</code> set the worker cross-checks every primary
            judge call against, and the Promoter replays proposed judge prompts against during gated
            promotion. Bulk upsert below for fast onboarding.
          </>
        }
      />

      {loadError && (
        <div className="mt-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Failed to load entries: {loadError}
        </div>
      )}

      <div className="mt-6">
        <JudgeBaselineEditor scope={scope} initial={entries} />
      </div>
    </div>
  );
}
