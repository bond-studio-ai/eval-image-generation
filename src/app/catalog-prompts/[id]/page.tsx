import { PageHeader } from '@/components/page-header';
import { CatalogPromptDetail } from '@/components/catalog-prompts/catalog-prompt-detail';
import { fetchAdminPrompts, type PromptVersion } from '@/lib/catalog-feed-client';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CatalogPromptDetailPage({ params }: PageProps) {
  const { id } = await params;

  // The admin API does not expose a single-prompt fetch yet. The full
  // list is small enough (one row per active (kind, scope) plus a
  // handful of proposals/retired) that fetching everything once and
  // picking the matching id on the server is cheaper than threading
  // an extra endpoint through the proxy + client.
  //
  // Capture errors into a variable rather than letting them escape
  // the render pipeline (mirrors catalog-runs/[id]/page.tsx). A raw
  // throw here would trip the route error boundary on every transient
  // proxy / auth failure and hide the underlying message; rendering
  // a friendly surface keeps the admin able to retry without losing
  // the URL state.
  let rows: PromptVersion[] = [];
  let loadError: string | null = null;
  try {
    rows = await fetchAdminPrompts({});
  } catch (err) {
    loadError = err instanceof Error ? err.message : String(err);
  }

  if (loadError) {
    return (
      <div>
        <PageHeader
          title="Could not load prompt"
          backHref="/catalog-prompts"
          backLabel="Catalog prompts"
        />
        <div className="mt-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {loadError}
        </div>
      </div>
    );
  }

  const prompt = rows.find((row) => row.id === id);
  if (!prompt) notFound();

  // The "history" surface is the chain of rows that share the same
  // (kind, scope). Sorting by createdAt descending keeps the most
  // recent proposal at the top, which matches the admin UI's mental
  // model for rotation.
  const history = rows
    .filter((row) => row.kind === prompt.kind && row.scope === prompt.scope)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));

  return <CatalogPromptDetail prompt={prompt} history={history} />;
}
