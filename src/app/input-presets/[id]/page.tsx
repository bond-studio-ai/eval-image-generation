import { InputPresetDetail } from '@/components/input-preset-detail';
import { fetchGenerations, fetchInputPresetById } from '@/lib/service-client';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

const IMAGE_COLUMNS_CAMEL = [
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

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function InputPresetDetailPage({ params }: PageProps) {
  const { id } = await params;

  const presetData = await fetchInputPresetById(id).catch(() => null);
  if (!presetData) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ipData = presetData as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stats = ipData.stats as Record<string, any> | undefined;

  const genResult = await fetchGenerations({ input_preset_id: id, limit: '100' });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const generations = (genResult.data ?? []) as any[];

  // Count populated image columns
  let keyedImageCount = 0;
  for (const col of IMAGE_COLUMNS_CAMEL) {
    const val = ipData[col];
    if (val != null && val !== '' && !(Array.isArray(val) && val.length === 0)) keyedImageCount++;
  }
  if (keyedImageCount === 0) {
    for (const col of IMAGE_COLUMNS_SNAKE) {
      const val = ipData[col];
      if (val != null && val !== '' && !(Array.isArray(val) && val.length === 0)) keyedImageCount++;
    }
  }
  const arbitraryImages = ipData.arbitraryImages ?? ipData.arbitrary_images;
  const arbitraryCount = Array.isArray(arbitraryImages) ? arbitraryImages.length : 0;
  const imageCount = keyedImageCount + arbitraryCount;

  const serializedData = {
    ...ipData,
    createdAt: ipData.createdAt ?? ipData.created_at,
    deletedAt: ipData.deletedAt ?? ipData.deleted_at ?? null,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const serializedGenerations = generations.map((g: any) => ({
    id: g.id,
    sceneAccuracyRating: g.sceneAccuracyRating ?? g.scene_accuracy_rating ?? null,
    productAccuracyRating: g.productAccuracyRating ?? g.product_accuracy_rating ?? null,
    createdAt: g.createdAt ?? g.created_at,
    outputImageCount: g.resultCount ?? g.result_count ?? 0,
    promptVersionName: g.promptName ?? g.prompt_name ?? null,
  }));

  const generationCount =
    stats?.generationCount ?? stats?.generation_count ?? generations.length;

  return (
    <InputPresetDetail
      data={serializedData}
      generations={serializedGenerations}
      stats={{
        generationCount,
        imageCount,
      }}
    />
  );
}
