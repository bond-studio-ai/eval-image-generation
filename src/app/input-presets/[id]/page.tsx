import { InputPresetDetail } from '@/components/input-preset-detail';
import { db } from '@/db';
import { inputPreset } from '@/db/schema';
import { eq } from 'drizzle-orm';
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

  const result = await db.query.inputPreset.findFirst({
    where: eq(inputPreset.id, id),
    with: {
      generations: {
        orderBy: (g, { desc }) => [desc(g.createdAt)],
        with: {
          results: true,
          promptVersion: {
            columns: { name: true },
          },
        },
      },
    },
  });

  if (!result) {
    notFound();
  }

  const { generations, ...ipData } = result;

  const keyedImageCount = IMAGE_COLUMNS.filter(
    (col) => (ipData as Record<string, unknown>)[col] != null,
  ).length;
  const arbitraryCount = Array.isArray(ipData.arbitraryImages) ? ipData.arbitraryImages.length : 0;
  const imageCount = keyedImageCount + arbitraryCount;

  const serializedData = {
    ...ipData,
    createdAt: ipData.createdAt.toISOString(),
    deletedAt: ipData.deletedAt?.toISOString() ?? null,
  };

  const serializedGenerations = generations.map((g) => ({
    id: g.id,
    sceneAccuracyRating: g.sceneAccuracyRating,
    productAccuracyRating: g.productAccuracyRating,
    createdAt: g.createdAt.toISOString(),
    outputImageCount: g.results.length,
    promptVersionName: g.promptVersion?.name ?? null,
  }));

  return (
    <InputPresetDetail
      data={serializedData}
      generations={serializedGenerations}
      stats={{
        generationCount: generations.length,
        imageCount,
      }}
    />
  );
}
