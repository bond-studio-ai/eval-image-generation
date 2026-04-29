import { CatalogPromptsList } from '@/components/catalog-prompts/catalog-prompts-list';
import { PageHeader, PrimaryLinkButton } from '@/components/page-header';
import { fetchAdminPrompts } from '@/lib/catalog-feed-client';

export const dynamic = 'force-dynamic';

export default async function CatalogPromptsPage() {
  let rows: Awaited<ReturnType<typeof fetchAdminPrompts>> = [];
  let error: string | null = null;
  try {
    rows = await fetchAdminPrompts({});
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  return (
    <div>
      <PageHeader
        title="Catalog Prompts"
        subtitle="Manage versioned prompts for catalog AI runs (extraction, image generation, judge, meta). Propose a new version or approve a pending proposal here; active prompts are the rows the worker attributes new runs to."
        actions={
          <PrimaryLinkButton href="/catalog-prompts/new" icon>
            New Prompt
          </PrimaryLinkButton>
        }
      />
      <CatalogPromptsList rows={rows} loadError={error} />
    </div>
  );
}
