import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PromptVersionDetail } from "@/components/prompt-version-detail";
import { parseOrFallback } from "@/lib/api/parse";
import { generationSummaryArraySchema } from "@/lib/api/schemas";
import { fetchGenerations, fetchPromptVersionById } from "@/lib/service-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Prompt Version",
  description: "Prompt version details and related generations."
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PromptVersionDetailPage({ params }: PageProps) {
  const { id } = await params;

  const pvData = await fetchPromptVersionById(id).catch(() => null);
  if (!pvData) notFound();

  const { stats } = pvData;

  const genResult = await fetchGenerations({ promptVersionId: id, limit: "100" });
  const generations = parseOrFallback(generationSummaryArraySchema, genResult.data, [], "prompt-version related generations");

  const serializedData = {
    id: pvData.id,
    name: pvData.name ?? null,
    description: pvData.description ?? null,
    systemPrompt: pvData.systemPrompt,
    userPrompt: pvData.userPrompt,
    deletedAt: pvData.deletedAt ?? null
  };

  const serializedGenerations = generations.map((generation) => ({
    id: generation.id,
    sceneAccuracyRating: generation.sceneAccuracyRating ?? null,
    productAccuracyRating: generation.productAccuracyRating ?? null,
    createdAt: generation.createdAt,
    inputImageCount: 0,
    outputImageCount: generation.resultCount ?? 0
  }));

  const generationCount = stats?.generationCount ?? generations.length;
  const ratedCount = stats?.ratedCount ?? serializedGenerations.filter((generation) => generation.sceneAccuracyRating !== null).length;
  const avgRating = stats?.avgRatingScore ?? null;

  return (
    <PromptVersionDetail
      data={serializedData}
      generations={serializedGenerations}
      stats={{
        generationCount,
        ratedCount,
        avgRating: avgRating === null ? null : String(avgRating),
        unratedCount: generationCount - ratedCount
      }}
    />
  );
}
