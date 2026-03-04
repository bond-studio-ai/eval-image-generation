import { InputPresetDetail } from '@/components/input-preset-detail';
import { fetchGenerations, fetchInputPresetById } from '@/lib/service-client';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

const IMAGE_COLUMNS = [
  'dollhouseView', 'realPhoto', 'moodBoard',
  'faucets', 'lightings', 'lvps', 'mirrors', 'paints', 'robeHooks',
  'shelves', 'showerGlasses', 'showerSystems', 'floorTiles', 'wallTiles',
  'showerWallTiles', 'showerFloorTiles', 'showerCurbTiles',
  'toiletPaperHolders', 'toilets', 'towelBars', 'towelRings',
  'tubDoors', 'tubFillers', 'tubs', 'vanities', 'wallpapers',
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
  const arbitraryImages = ipData.arbitraryImages;
  const arbitraryCount = Array.isArray(arbitraryImages) ? arbitraryImages.length : 0;
  const imageCount = keyedImageCount + arbitraryCount;

  const serializedData = {
    ...ipData,
    createdAt: ipData.createdAt,
    deletedAt: ipData.deletedAt ?? null,
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
    stats?.generationCount ?? generations.length;

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
