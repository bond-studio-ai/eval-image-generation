import { EmptyState } from '@/components/empty-state';
import { InputPresetsList, type InputPresetRow } from '@/components/input-presets-list';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ page?: string; include_deleted?: string }>;
}

const IMAGE_COLUMNS = [
  'dollhouseView', 'realPhoto', 'moodBoard',
  'faucets', 'lightings', 'lvps', 'mirrors', 'paints', 'robeHooks',
  'shelves', 'showerGlasses', 'showerSystems', 'floorTiles', 'wallTiles',
  'showerWallTiles', 'showerFloorTiles', 'showerCurbTiles',
  'toiletPaperHolders', 'toilets', 'towelBars', 'towelRings',
  'tubDoors', 'tubFillers', 'tubs', 'vanities', 'wallpapers',
] as const;

const IMAGE_COLUMNS_SNAKE = [
  'dollhouse_view', 'real_photo', 'mood_board',
  'faucets', 'lightings', 'lvps', 'mirrors', 'paints', 'robe_hooks',
  'shelves', 'shower_glasses', 'shower_systems', 'floor_tiles', 'wall_tiles',
  'shower_wall_tiles', 'shower_floor_tiles', 'shower_curb_tiles',
  'toilet_paper_holders', 'toilets', 'towel_bars', 'towel_rings',
  'tub_doors', 'tub_fillers', 'tubs', 'vanities', 'wallpapers',
] as const;

export default async function InputPresetsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || '1', 10);
  const limit = 20;
  const includeDeleted = params.include_deleted === 'true';

  const base = process.env.BASE_API_HOSTNAME;
  if (!base) throw new Error('BASE_API_HOSTNAME is not set');

  const qs = new URLSearchParams({ limit: String(limit), page: String(page) });
  if (includeDeleted) qs.set('include_deleted', 'true');

  const res = await fetch(
    `${base.replace(/\/$/, '')}/image-generation/v1/input-presets?${qs}`,
    { cache: 'no-store' },
  );
  if (!res.ok) throw new Error(`Service ${res.status}`);
  const json = await res.json();

  const total: number = json.pagination.total;
  const totalPages: number =
    json.pagination.totalPages ?? json.pagination.total_pages ?? Math.ceil(total / limit);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: InputPresetRow[] = json.data.map((item: any) => ({
    id: item.id,
    name: item.name ?? null,
    description: item.description ?? null,
    imageCount: item.imageCount ?? item.image_count ?? computeImageCount(item),
    generationCount: item.generationCount ?? item.stats?.generation_count ?? 0,
    createdAt: item.createdAt ?? item.created_at,
    deletedAt: item.deletedAt ?? item.deleted_at ?? null,
  }));

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Input Presets</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage reusable sets of input images for generation.
          </p>
        </div>
        <Link
          href="/input-presets/new"
          className="bg-primary-600 hover:bg-primary-700 rounded-lg px-4 py-2 text-sm font-medium text-white shadow-xs"
        >
          New Input Preset
        </Link>
      </div>

      {data.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No input presets"
            description="Get started by creating your first input preset."
            action={
              <Link
                href="/input-presets/new"
                className="bg-primary-600 hover:bg-primary-700 rounded-lg px-4 py-2 text-sm font-medium text-white shadow-xs"
              >
                Create Input Preset
              </Link>
            }
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
    const val = item[IMAGE_COLUMNS[i]] ?? item[IMAGE_COLUMNS_SNAKE[i]];
    if (Array.isArray(val)) {
      count += val.filter((v: unknown) => typeof v === 'string' && v !== '').length;
    } else if (typeof val === 'string' && val !== '') {
      count += 1;
    }
  }
  const arbitrary = item.arbitraryImages ?? item.arbitrary_images;
  if (Array.isArray(arbitrary)) count += arbitrary.length;
  return count;
}
