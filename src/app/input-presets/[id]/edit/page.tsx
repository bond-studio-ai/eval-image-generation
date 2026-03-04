import { fetchInputPresetById } from '@/lib/service-client';
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

const PRODUCT_KEYS_SNAKE = [
  'faucets', 'lightings', 'lvps', 'mirrors', 'paints', 'robe_hooks',
  'shelves', 'shower_glasses', 'shower_systems', 'floor_tiles', 'wall_tiles',
  'shower_wall_tiles', 'shower_floor_tiles', 'shower_curb_tiles',
  'toilet_paper_holders', 'toilets', 'towel_bars', 'towel_rings',
  'tub_doors', 'tub_fillers', 'tubs', 'vanities', 'wallpapers',
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

  const presetData = await fetchInputPresetById(id).catch(() => null);
  if (!presetData) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const preset = presetData as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stats = preset.stats as Record<string, any> | undefined;
  const generationCount = stats?.generationCount ?? stats?.generation_count ?? 0;

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
  for (let i = 0; i < PRODUCT_KEYS.length; i++) {
    const camelKey = PRODUCT_KEYS[i];
    const snakeKey = PRODUCT_KEYS_SNAKE[i];
    const val = preset[camelKey] ?? preset[snakeKey];
    const urls = Array.isArray(val) ? val.filter((v: unknown): v is string => typeof v === 'string' && !!v) : [];
    if (urls.length > 0) {
      const outKey = CAMEL_TO_SNAKE[camelKey] ?? camelKey;
      productImages[outKey] = urls;
    }
  }

  const arbitraryImages = preset.arbitraryImages ?? preset.arbitrary_images;
  const initialData = {
    id: preset.id,
    name: preset.name ?? '',
    description: preset.description ?? '',
    dollhouseView: preset.dollhouseView ?? preset.dollhouse_view ?? null,
    realPhoto: preset.realPhoto ?? preset.real_photo ?? null,
    moodBoard: preset.moodBoard ?? preset.mood_board ?? null,
    productImages,
    arbitraryImages: Array.isArray(arbitraryImages)
      ? (arbitraryImages as { url: string; tag?: string }[]).map((a) => ({ url: a.url, tag: a.tag }))
      : [],
  };

  return <InputPresetEditForm initialData={initialData} />;
}
