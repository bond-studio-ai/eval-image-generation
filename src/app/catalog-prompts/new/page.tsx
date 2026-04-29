import { CatalogPromptForm } from '@/components/catalog-prompts/catalog-prompt-form';
import { fetchAdminPrompts, type PromptVersion } from '@/lib/catalog-feed-client';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ parentId?: string }>;
}

export default async function NewCatalogPromptPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const parentId = sp.parentId?.trim() || null;

  let parent: PromptVersion | null = null;
  let availableScopes: PromptVersion[] = [];
  let loadError: string | null = null;
  try {
    // The admin API does not expose a single-prompt fetch, so we
    // pull the full catalogue once and pick the parent (if any) on
    // the server. The dataset is small (one row per active
    // (kind, scope) plus a handful of proposals/retired), so a
    // single GET is cheaper than threading state across the
    // server -> client boundary.
    availableScopes = await fetchAdminPrompts({});
    if (parentId) {
      parent = availableScopes.find((row) => row.id === parentId) ?? null;
    }
  } catch (err) {
    loadError = err instanceof Error ? err.message : String(err);
  }

  return (
    <CatalogPromptForm
      mode={parent ? 'new-version' : 'new'}
      parent={parent}
      availableScopes={availableScopes.map((row) => ({ kind: row.kind, scope: row.scope }))}
      loadError={loadError}
    />
  );
}
