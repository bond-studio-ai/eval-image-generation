import { INPUT_PRESET_SLOT_TO_LEGACY_URL_KEY } from '@/lib/input-preset-design';
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
  const arbitrarySlot = Object.keys(INPUT_PRESET_SLOT_TO_LEGACY_URL_KEY).find(
    (slot) => ipData[`${slot}ImageType`] === 'arbitrary'
  );
  const arbitraryColumn = arbitrarySlot ? INPUT_PRESET_SLOT_TO_LEGACY_URL_KEY[arbitrarySlot] : null;
  const arbitraryValue = arbitraryColumn ? ipData[arbitraryColumn] : null;
  const arbitraryCount =
    (typeof arbitraryValue === 'string' && arbitraryValue.length > 0) ||
    (Array.isArray(arbitraryValue) &&
      arbitraryValue.some((value: unknown) => typeof value === 'string' && value.length > 0))
      ? 1
      : 0;
  const imageCount = keyedImageCount + arbitraryCount;

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
