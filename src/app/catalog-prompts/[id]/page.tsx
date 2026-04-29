import { CatalogPromptDetail } from '@/components/catalog-prompts/catalog-prompt-detail';
import { fetchAdminPrompts } from '@/lib/catalog-feed-client';
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
  const rows = await fetchAdminPrompts({});
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
