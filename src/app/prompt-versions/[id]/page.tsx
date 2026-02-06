import { PromptVersionDetail } from '@/components/prompt-version-detail';
import { db } from '@/db';
import { promptVersion } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PromptVersionDetailPage({ params }: PageProps) {
  const { id } = await params;

  const result = await db.query.promptVersion.findFirst({
    where: eq(promptVersion.id, id),
    with: {
      generations: {
        orderBy: (g, { desc }) => [desc(g.createdAt)],
        with: {
          results: true,
        },
      },
    },
  });

  if (!result) {
    notFound();
  }

  const generations = result.generations;
  const rated = generations.filter((g: { resultRating: string | null }) => g.resultRating !== null);
  const ratingMap: Record<string, number> = {
    FAILED: 0,
    POOR: 1,
    ACCEPTABLE: 2,
    GOOD: 3,
    EXCELLENT: 4,
  };

  const avgRating =
    rated.length > 0
      ? (
          rated.reduce((sum: number, g: { resultRating: string | null }) => sum + (ratingMap[g.resultRating!] ?? 0), 0) / rated.length
        ).toFixed(2)
      : null;

  // Serialize for client component
  const serializedData = {
    id: result.id,
    name: result.name,
    description: result.description,
    systemPrompt: result.systemPrompt,
    userPrompt: result.userPrompt,
    model: result.model,
    outputType: result.outputType,
    aspectRatio: result.aspectRatio,
    outputResolution: result.outputResolution,
    temperature: result.temperature,
    deletedAt: result.deletedAt?.toISOString() ?? null,
  };

  const serializedGenerations = generations.map((g) => ({
    id: g.id,
    resultRating: g.resultRating,
    createdAt: g.createdAt.toISOString(),
    inputImageCount: 0, // Input is now structured, not a count
    outputImageCount: g.results.length,
  }));

  return (
    <PromptVersionDetail
      data={serializedData}
      generations={serializedGenerations}
      stats={{
        generationCount: generations.length,
        ratedCount: rated.length,
        avgRating,
        unratedCount: generations.length - rated.length,
      }}
    />
  );
}
