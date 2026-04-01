import { getInputPresetStoredImages } from '@/lib/input-preset-design';
import { InputPresetDetail } from '@/components/input-preset-detail';
import { fetchGenerations, fetchInputPresetById } from '@/lib/service-client';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

const IMAGE_COLUMNS = [
  'dollhouseView', 'realPhoto', 'moodBoard',
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
  const imageCount = keyedImageCount + getInputPresetStoredImages(ipData as Record<string, unknown>).length;

  const serializedData = {
    ...ipData,
    createdAt: ipData.createdAt ?? ipData.created_at,
    deletedAt: ipData.deletedAt ?? ipData.deleted_at ?? null,
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
