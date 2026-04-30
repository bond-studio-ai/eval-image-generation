import { JudgeBaselineEditor } from '@/components/judge-baselines/judge-baseline-editor';
import { PageHeader } from '@/components/page-header';
import { fetchJudgeBaselineEntries, type JudgeBaselineEntry } from '@/lib/catalog-feed-client';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ scope: string }>;
}

/**
 * Per-scope baseline editor. Next.js 15's async `params` does NOT
 * URL-decode the dynamic route segment — empirically, navigating to
 * `/judge-baselines/vanities%3AtearSheet` (the form the index page
 * builds via `encodeURIComponent`) hands the page back the segment
 * still encoded as `vanities%3AtearSheet`. Without an explicit
 * decode here, the title renders the percent-escape and every
 * downstream call (`fetchJudgeBaselineEntries`, the proxy PUT /
 * DELETE / bulk paths in the editor below) re-encodes the already-
 * encoded value into `vanities%253AtearSheet`, which doesn't match
 * any DB scope and silently returns zero rows. The first decode
 * here is intentional and required.
 *
 * `decodeURIComponent` is idempotent on strings without percent
 * sequences, so seeing an already-decoded scope here is a no-op.
 * The try/catch defends against the pathological case where the
 * segment ends up containing a stray `%` (the only way the decode
 * can throw URIError); we fall back to the raw param so the page
 * at least renders a load error instead of a 500.
 */
export default async function JudgeBaselineScopePage({ params }: PageProps) {
  const { scope: rawScope } = await params;
  const scope = safeDecodeScope(rawScope);
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

/**
 * safeDecodeScope decodes the percent-encoded scope segment Next.js
 * hands us in `params`. We only ever expect well-formed encodings
 * produced by the index page's `encodeURIComponent` call, but if a
 * malformed value somehow lands here (a manual URL paste, a
 * crawler, etc.) we fall back to the raw segment so the route
 * still renders something instead of throwing into the error
 * boundary. The downstream API call will then surface a 4xx that
 * the friendly load-error banner can show.
 */
function safeDecodeScope(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}
