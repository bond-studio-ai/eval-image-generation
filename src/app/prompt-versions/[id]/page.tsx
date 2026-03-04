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

  const genResult = await fetchGenerations({ prompt_version_id: id, limit: '100' });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const generations = (genResult.data ?? []) as any[];

  const serializedData = {
    id: pv.id,
    name: pv.name ?? null,
    description: pv.description ?? null,
    systemPrompt: pv.systemPrompt ?? pv.system_prompt,
    userPrompt: pv.userPrompt ?? pv.user_prompt,
    deletedAt: pv.deletedAt ?? pv.deleted_at ?? null,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const serializedGenerations = generations.map((g: any) => ({
    id: g.id,
    sceneAccuracyRating: g.sceneAccuracyRating ?? g.scene_accuracy_rating ?? null,
    productAccuracyRating: g.productAccuracyRating ?? g.product_accuracy_rating ?? null,
    createdAt: g.createdAt ?? g.created_at,
    inputImageCount: 0,
    outputImageCount: g.resultCount ?? g.result_count ?? 0,
  }));

  const generationCount =
    stats?.generationCount ?? stats?.generation_count ?? generations.length;
  const ratedCount =
    stats?.ratedCount ??
    stats?.rated_count ??
    serializedGenerations.filter(
      (g: { sceneAccuracyRating: string | null }) => g.sceneAccuracyRating !== null,
    ).length;
  const avgRating = stats?.avgRatingScore ?? stats?.avg_rating_score ?? null;

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
