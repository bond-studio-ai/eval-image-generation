import { EmptyState } from '@/components/empty-state';
import { Pagination } from '@/components/pagination';
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

  const data = await Promise.all(
    rows.map(async (ip) => {
      const genCount = await db
        .select({ count: count() })
        .from(generation)
        .where(eq(generation.inputPresetId, ip.id));

      const imageCount = IMAGE_COLUMNS.filter(
        (col) => (ip as Record<string, unknown>)[col] != null,
      ).length;

      return { ...ip, generationCount: genCount[0]?.count ?? 0, imageCount };
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
        <div className="mt-8 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xs">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-600 uppercase">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-600 uppercase">
                  Images
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-600 uppercase">
                  Generations
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-600 uppercase">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-600 uppercase">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {data.map((ip) => (
                <tr key={ip.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <Link
                      href={`/input-presets/${ip.id}`}
                      className="hover:text-primary-600 text-sm font-medium text-gray-900"
                    >
                      {ip.name || 'Untitled'}
                    </Link>
                    {ip.description && (
                      <p className="mt-1 max-w-xs truncate text-xs text-gray-600">{ip.description}</p>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-700">
                    {ip.imageCount} image{ip.imageCount !== 1 ? 's' : ''}
                  </td>
                  <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-700">
                    {ip.generationCount}
                  </td>
                  <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-700">
                    {new Date(ip.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm whitespace-nowrap">
                    {ip.deletedAt ? (
                      <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-red-600/20 ring-inset">
                        Deleted
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-green-600/20 ring-inset">
                        Active
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} totalPages={totalPages} total={total} />
        </div>
      )}
    </div>
  );
}
