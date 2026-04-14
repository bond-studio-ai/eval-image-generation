import { imageGenerationBase } from '@/lib/env';
import { EmptyState } from '@/components/empty-state';
import { PageHeader, PrimaryLinkButton } from '@/components/page-header';
import { PromptVersionsList, type PromptVersionRow } from '@/components/prompt-versions-list';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ page?: string; include_deleted?: string }>;
}

export default async function PromptVersionsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || '1', 10);
  const limit = 20;
  const includeDeleted = params.include_deleted === 'true';

  const qs = new URLSearchParams({ limit: String(limit), page: String(page) });
  if (includeDeleted) qs.set('include_deleted', 'true');

  const res = await fetch(
    `${imageGenerationBase()}/prompt-versions?${qs}`,
    { cache: 'no-store' },
  );
  if (!res.ok) throw new Error(`Service ${res.status}`);
  const json = await res.json();

  const total: number = json.pagination.total;
  const totalPages: number =
    json.pagination.totalPages ?? Math.ceil(total / limit);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: PromptVersionRow[] = json.data.map((item: any) => ({
    id: item.id,
    name: item.name ?? null,
    description: item.description ?? null,
    systemPrompt: item.systemPrompt,
    userPrompt: item.userPrompt,
    generationCount: item.generationCount ?? 0,
    createdAt: item.createdAt,
    deletedAt: item.deletedAt ?? null,
  }));

  return (
    <div>
      <PageHeader
        title="Prompt Versions"
        subtitle="Manage versioned prompts for image generation."
        actions={<PrimaryLinkButton href="/prompt-versions/new" icon>New Prompt Version</PrimaryLinkButton>}
      />

      {data.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No prompt versions"
            description="Get started by creating your first prompt version."
            action={<PrimaryLinkButton href="/prompt-versions/new" icon>Create Prompt Version</PrimaryLinkButton>}
          />
        </div>
      ) : (
        <PromptVersionsList data={data} page={page} totalPages={totalPages} total={total} />
      )}
    </div>
  );
}
