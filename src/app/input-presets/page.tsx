import { EmptyState } from '@/components/empty-state';
import { InputPresetsList, type InputPresetRow } from '@/components/input-presets-list';
import { db } from '@/db';
import { generation, inputPreset } from '@/db/schema';
import { and, count, desc, eq, isNull } from 'drizzle-orm';
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

export default async function InputPresetsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || '1', 10);
  const limit = 20;
  const includeDeleted = params.include_deleted === 'true';
  const offset = (page - 1) * limit;

  const conditions = includeDeleted ? [] : [isNull(inputPreset.deletedAt)];

  const [rows, totalResult] = await Promise.all([
    db
      .select()
      .from(inputPreset)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(inputPreset.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: count() })
      .from(inputPreset)
      .where(conditions.length > 0 ? and(...conditions) : undefined),
  ]);

  const total = totalResult[0]?.count ?? 0;
  const totalPages = Math.ceil(total / limit);

  const data: InputPresetRow[] = await Promise.all(
    rows.map(async (ip) => {
      const genCount = await db
        .select({ count: count() })
        .from(generation)
        .where(eq(generation.inputPresetId, ip.id));

      const imageCount = IMAGE_COLUMNS.filter(
        (col) => (ip as Record<string, unknown>)[col] != null,
      ).length;

      return {
        id: ip.id,
        name: ip.name,
        description: ip.description,
        imageCount,
        generationCount: genCount[0]?.count ?? 0,
        createdAt: ip.createdAt.toISOString(),
        deletedAt: ip.deletedAt?.toISOString() ?? null,
      };
    }),
  );

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
