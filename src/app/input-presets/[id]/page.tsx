import { InputPresetDetail } from '@/components/input-preset-detail';
import { fetchGenerations, fetchInputPresetById } from '@/lib/service-client';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

const IMAGE_COLUMNS = [
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

  const genResult = await fetchGenerations({ inputPresetId: id, limit: '100' });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const generations = (genResult.data ?? []) as any[];

  // Count populated image columns
  let keyedImageCount = 0;
  for (const col of IMAGE_COLUMNS) {
    const val = ipData[col];
    if (val != null && val !== '' && !(Array.isArray(val) && val.length === 0)) keyedImageCount++;
  }
  const arbitraryImages = ipData.arbitrary_images ?? ipData.arbitraryImages;
  const arbitraryCount = Array.isArray(arbitraryImages) ? arbitraryImages.length : 0;
  const imageCount = keyedImageCount + arbitraryCount;

  const serializedData = {
    ...ipData,
    createdAt: ipData.created_at ?? ipData.createdAt,
    deletedAt: ipData.deleted_at ?? ipData.deletedAt ?? null,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const serializedGenerations = generations.map((g: any) => ({
    id: g.id,
    sceneAccuracyRating: g.sceneAccuracyRating ?? null,
    productAccuracyRating: g.productAccuracyRating ?? null,
    createdAt: g.createdAt,
    outputImageCount: g.resultCount ?? 0,
    promptVersionName: g.promptName ?? null,
  }));

  const generationCount =
    stats?.generation_count ?? stats?.generationCount ?? generations.length;

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
