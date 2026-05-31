import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PromptVersionDetail } from "@/components/prompt-version-detail";
import { fetchGenerations, fetchPromptVersionById } from "@/lib/service-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Prompt Version",
  description: "Prompt version details and related generations."
};

interface PageProps {
  params: Promise<{ id: string }>;
}

interface PromptVersionStats {
  generationCount?: number;
  ratedCount?: number;
  avgRatingScore?: number;
}

export default async function PromptVersionDetailPage({ params }: PageProps) {
  const { id } = await params;

  const pvData = await fetchPromptVersionById(id).catch(() => null);
  if (!pvData) notFound();

  const pv = pvData as any;
  const stats = pv.stats as PromptVersionStats | undefined;

  const genResult = await fetchGenerations({ promptVersionId: id, limit: "100" });
  const generations = (genResult.data ?? []) as any[];

  const serializedData = {
    id: pv.id,
    name: pv.name ?? null,
    description: pv.description ?? null,
    systemPrompt: pv.systemPrompt,
    userPrompt: pv.userPrompt,
    deletedAt: pv.deletedAt ?? null
  };

  const serializedGenerations = generations.map((generation: any) => ({
    id: generation.id,
    sceneAccuracyRating: generation.sceneAccuracyRating ?? null,
    productAccuracyRating: generation.productAccuracyRating ?? null,
    createdAt: generation.createdAt,
    inputImageCount: 0,
    outputImageCount: generation.resultCount ?? 0
  }));

  const generationCount = stats?.generationCount ?? generations.length;
  const ratedCount = stats?.ratedCount ?? serializedGenerations.filter((generation: { sceneAccuracyRating: string | null }) => generation.sceneAccuracyRating !== null).length;
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
