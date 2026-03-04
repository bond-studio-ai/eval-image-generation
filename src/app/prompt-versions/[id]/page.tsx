import { PromptVersionDetail } from '@/components/prompt-version-detail';
import { fetchGenerations, fetchPromptVersionById } from '@/lib/service-client';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PromptVersionDetailPage({ params }: PageProps) {
  const { id } = await params;

  const pvData = await fetchPromptVersionById(id).catch(() => null);
  if (!pvData) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pv = pvData as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stats = pv.stats as Record<string, any> | undefined;

  const genResult = await fetchGenerations({ promptVersionId: id, limit: '100' });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const generations = (genResult.data ?? []) as any[];

  const serializedData = {
    id: pv.id,
    name: pv.name ?? null,
    description: pv.description ?? null,
    systemPrompt: pv.systemPrompt,
    userPrompt: pv.userPrompt,
    deletedAt: pv.deletedAt ?? null,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const serializedGenerations = generations.map((g: any) => ({
    id: g.id,
    sceneAccuracyRating: g.sceneAccuracyRating ?? null,
    productAccuracyRating: g.productAccuracyRating ?? null,
    createdAt: g.createdAt,
    inputImageCount: 0,
    outputImageCount: g.resultCount ?? 0,
  }));

  const generationCount =
    stats?.generationCount ?? generations.length;
  const ratedCount =
    stats?.ratedCount ??
    serializedGenerations.filter(
      (g: { sceneAccuracyRating: string | null }) => g.sceneAccuracyRating !== null,
    ).length;
  const avgRating = stats?.avgRatingScore ?? null;

  return (
    <PromptVersionDetail
      data={serializedData}
      generations={serializedGenerations}
      stats={{
        generationCount,
        ratedCount,
        avgRating: avgRating !== null ? String(avgRating) : null,
        unratedCount: generationCount - ratedCount,
      }}
    />
  );
}
