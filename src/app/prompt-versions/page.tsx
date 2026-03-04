import { EmptyState } from '@/components/empty-state';
import { PromptVersionsList, type PromptVersionRow } from '@/components/prompt-versions-list';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ page?: string; include_deleted?: string }>;
}

export default async function PromptVersionsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || '1', 10);
  const limit = 20;
  const includeDeleted = params.include_deleted === 'true';

  const base = process.env.BASE_API_HOSTNAME;
  if (!base) throw new Error('BASE_API_HOSTNAME is not set');

  const qs = new URLSearchParams({ limit: String(limit), page: String(page) });
  if (includeDeleted) qs.set('include_deleted', 'true');

  const res = await fetch(
    `${base.replace(/\/$/, '')}/image-generation/v1/prompt-versions?${qs}`,
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Prompt Versions</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage versioned prompts for image generation.
          </p>
        </div>
        <Link
          href="/prompt-versions/new"
          className="bg-primary-600 hover:bg-primary-700 rounded-lg px-4 py-2 text-sm font-medium text-white shadow-xs"
        >
          New Prompt Version
        </Link>
      </div>

      {data.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No prompt versions"
            description="Get started by creating your first prompt version."
            action={
              <Link
                href="/prompt-versions/new"
                className="bg-primary-600 hover:bg-primary-700 rounded-lg px-4 py-2 text-sm font-medium text-white shadow-xs"
              >
                Create Prompt Version
              </Link>
            }
          />
        </div>
      ) : (
        <PromptVersionsList data={data} page={page} totalPages={totalPages} total={total} />
      )}
    </div>
  );
}
