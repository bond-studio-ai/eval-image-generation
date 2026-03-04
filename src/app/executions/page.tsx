import { EmptyState } from '@/components/empty-state';
import { GenerationsList, type GenerationRow } from '@/components/generations-list';
import { fetchGenerations, fetchPromptVersions } from '@/lib/service-client';
import Link from 'next/link';
import { GenerationsFilters } from '@/app/generations/generations-filters';
import { ExecutionsPageHeader } from './executions-page-header';
import { ExecutionsTabs } from './executions-tabs';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20;

interface PageProps {
  searchParams: Promise<{
    tab?: string;
    page?: string;
    prompt_version_id?: string;
    scene_accuracy_rating?: string;
    product_accuracy_rating?: string;
    unrated?: string;
    from?: string;
    to?: string;
    sort?: string;
    order?: string;
  }>;
}

export default async function ExecutionsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const activeTab = params.tab === 'generations' ? 'generations' : 'batches';

  if (activeTab === 'generations') {
    return <GenerationsTab params={params} />;
  }

  return (
    <div>
      <ExecutionsTabs />
    </div>
  );
}

function TabNav({ active }: { active: 'batches' | 'generations' }) {
  return (
    <div className="mb-6 flex gap-1 border-b border-gray-200">
      <Link
        href="/executions"
        className={`border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
          active === 'batches'
            ? 'border-primary-600 text-primary-700'
            : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
        }`}
      >
        Batches
      </Link>
      <Link
        href="/executions?tab=generations"
        className={`border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
          active === 'generations'
            ? 'border-primary-600 text-primary-700'
            : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
        }`}
      >
        Generations
      </Link>
    </div>
  );
}

async function GenerationsTab({ params }: { params: Record<string, string | undefined> }) {
  const queryParams: Record<string, string> = {};
  if (params.prompt_version_id) queryParams.promptVersionId = params.prompt_version_id;
  if (params.scene_accuracy_rating) queryParams.sceneAccuracyRating = params.scene_accuracy_rating;
  if (params.product_accuracy_rating) queryParams.productAccuracyRating = params.product_accuracy_rating;
  if (params.unrated) queryParams.unrated = params.unrated;
  if (params.from) queryParams.from = params.from;
  if (params.to) queryParams.to = params.to;
  queryParams.order = params.order === 'asc' ? 'asc' : 'desc';
  queryParams.limit = String(PAGE_SIZE);
  if (params.page) queryParams.page = params.page;

  const [json, promptVersions] = await Promise.all([
    fetchGenerations(queryParams),
    fetchPromptVersions(200),
  ]);

  const total = Number(json.pagination?.total ?? 0);

  const initialData: GenerationRow[] = (json.data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    promptVersionId: row.promptVersionId as string,
    promptName: (row.promptName ?? null) as string | null,
    sceneAccuracyRating: (row.sceneAccuracyRating ?? null) as string | null,
    productAccuracyRating: (row.productAccuracyRating ?? null) as string | null,
    notes: (row.notes ?? null) as string | null,
    executionTime: (row.executionTime ?? null) as number | null,
    createdAt: row.createdAt as string,
    resultUrls: (row.resultUrls ?? []) as string[],
    resultCount: (row.resultCount ?? 0) as number,
  }));

  const filters = {
    sceneAccuracyRating: params.scene_accuracy_rating,
    productAccuracyRating: params.product_accuracy_rating,
    unrated: params.unrated,
    promptVersionId: params.prompt_version_id,
    from: params.from,
    to: params.to,
    sort: params.sort ?? 'created_at',
    order: params.order ?? 'desc',
  };

  return (
    <div>
      <ExecutionsPageHeader />
      <TabNav active="generations" />

      <GenerationsFilters params={params} promptVersions={promptVersions} />

      {initialData.length === 0 ? (
        <div className="mt-8">
          <EmptyState title="No generations found" description="No generations match your current filters." />
        </div>
      ) : (
        <GenerationsList initialData={initialData} initialTotal={total} pageSize={PAGE_SIZE} filters={filters} />
      )}
    </div>
  );
}
