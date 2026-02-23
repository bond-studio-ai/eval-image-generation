import { db } from '@/db';
import { generation, inputPreset } from '@/db/schema';
import { count, eq } from 'drizzle-orm';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { InputPresetEditForm } from './edit-form';

export const dynamic = 'force-dynamic';

const PRODUCT_KEYS = [
  'faucets', 'lightings', 'lvps', 'mirrors', 'paints', 'robeHooks',
  'shelves', 'showerGlasses', 'showerSystems', 'floorTiles', 'wallTiles',
  'showerWallTiles', 'showerFloorTiles', 'showerCurbTiles',
  'toiletPaperHolders', 'toilets', 'towelBars', 'towelRings',
  'tubDoors', 'tubFillers', 'tubs', 'vanities', 'wallpapers',
] as const;

const CAMEL_TO_SNAKE: Record<string, string> = {
  robeHooks: 'robe_hooks',
  showerGlasses: 'shower_glasses',
  showerSystems: 'shower_systems',
  floorTiles: 'floor_tiles',
  wallTiles: 'wall_tiles',
  showerWallTiles: 'shower_wall_tiles',
  showerFloorTiles: 'shower_floor_tiles',
  showerCurbTiles: 'shower_curb_tiles',
  toiletPaperHolders: 'toilet_paper_holders',
  towelBars: 'towel_bars',
  towelRings: 'towel_rings',
  tubDoors: 'tub_doors',
  tubFillers: 'tub_fillers',
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function InputPresetEditPage({ params }: PageProps) {
  const { id } = await params;

  const preset = await db.query.inputPreset.findFirst({
    where: eq(inputPreset.id, id),
  });

  if (!preset) {
    notFound();
  }

  const genResult = await db
    .select({ count: count() })
    .from(generation)
    .where(eq(generation.inputPresetId, id));
  const generationCount = genResult[0]?.count ?? 0;

  if (generationCount > 0) {
    return (
      <div>
        <Link href={`/input-presets/${id}`} className="text-sm text-gray-600 hover:text-gray-900">
          &larr; Back to preset
        </Link>
        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-6">
          <h2 className="text-lg font-semibold text-amber-900">Cannot edit this preset</h2>
          <p className="mt-2 text-sm text-amber-800">
            This preset has been used in {generationCount} generation{generationCount !== 1 ? 's' : ''}. To change it, clone the preset first, then edit the copy.
          </p>
          <Link
            href={`/input-presets/${id}`}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100"
          >
            Back to preset (use Clone there)
          </Link>
        </div>
      </div>
    );
  }

  const productImages: Record<string, string[]> = {};
  const rec = preset as Record<string, unknown>;
  for (const k of PRODUCT_KEYS) {
    const val = rec[k];
    const urls = Array.isArray(val) ? val.filter((v): v is string => typeof v === 'string' && !!v) : [];
    if (urls.length > 0) {
      const snakeKey = CAMEL_TO_SNAKE[k] ?? k;
      productImages[snakeKey] = urls;
    }
  }

  const initialData = {
    id: preset.id,
    name: preset.name ?? '',
    description: preset.description ?? '',
    dollhouseView: preset.dollhouseView ?? null,
    realPhoto: preset.realPhoto ?? null,
    moodBoard: preset.moodBoard ?? null,
    productImages,
    arbitraryImages: Array.isArray(preset.arbitraryImages)
      ? (preset.arbitraryImages as { url: string; tag?: string }[]).map((a) => ({ url: a.url, tag: a.tag }))
      : [],
  };

  return <InputPresetEditForm initialData={initialData} />;
}
