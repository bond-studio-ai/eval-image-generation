import { imageGenerationBase } from '@/lib/env';
import { getInputPresetStoredImages } from '@/lib/input-preset-design';
import { EmptyState } from '@/components/empty-state';
import { InputPresetsList, type InputPresetRow } from '@/components/input-presets-list';
import { PageHeader, PrimaryLinkButton } from '@/components/page-header';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ page?: string; include_deleted?: string }>;
}

const IMAGE_COLUMNS = [
  'dollhouseView', 'realPhoto', 'moodBoard',
] as const;

export default async function InputPresetsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || '1', 10);
  const limit = 20;
  const includeDeleted = params.include_deleted === 'true';

  const qs = new URLSearchParams({ limit: String(limit), page: String(page) });
  if (includeDeleted) qs.set('include_deleted', 'true');

  const res = await fetch(
    `${imageGenerationBase()}/input-presets?${qs}`,
    { cache: 'no-store' },
  );
  if (!res.ok) throw new Error(`Service ${res.status}`);
  const json = await res.json();

  const total: number = json.pagination.total;
  const totalPages: number =
    json.pagination.totalPages ?? Math.ceil(total / limit);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: InputPresetRow[] = json.data.map((item: any) => ({
    id: item.id,
    name: item.name ?? null,
    description: item.description ?? null,
    imageCount: item.imageCount ?? computeImageCount(item),
    generationCount: item.stats?.generationCount ?? item.generationCount ?? 0,
    createdAt: item.createdAt ?? item.created_at,
    deletedAt: item.deletedAt ?? item.deleted_at ?? null,
  }));

  return (
    <div>
      <PageHeader
        title="Input Presets"
        subtitle="Manage reusable sets of input images for generation."
        actions={<PrimaryLinkButton href="/input-presets/new" icon>New Input Preset</PrimaryLinkButton>}
      />

      {data.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No input presets"
            description="Get started by creating your first input preset."
            action={<PrimaryLinkButton href="/input-presets/new" icon>Create Input Preset</PrimaryLinkButton>}
          />
        </div>
      ) : (
        <InputPresetsList data={data} page={page} totalPages={totalPages} total={total} />
      )}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function computeImageCount(item: any): number {
  let count = 0;
  for (let i = 0; i < IMAGE_COLUMNS.length; i++) {
    const val = item[IMAGE_COLUMNS[i]];
    if (Array.isArray(val)) {
      count += val.filter((v: unknown) => typeof v === 'string' && v !== '').length;
    } else if (typeof val === 'string' && val !== '') {
      count += 1;
    }
  }
  count += getInputPresetStoredImages(item as Record<string, unknown>).length;
  return count;
}
