import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InputPresetDetail } from "@/components/input-preset-detail";
import { catchToNull } from "@/lib/async-utils";
import { parseOrFallback } from "@/lib/api/parse";
import { generationSummaryArraySchema } from "@/lib/api/schemas";
import { getInputPresetStoredImages } from "@/lib/input-preset-design";
import { fetchGenerations, fetchInputPresetById, type InputPresetWithStats } from "@/lib/service-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Input Preset",
  description: "Input preset details, attached images, and related generations."
};

const IMAGE_COLUMNS = ["dollhouseView", "realPhoto", "moodBoard"] as const;

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function InputPresetDetailPage({ params }: PageProps) {
  const { id } = await params;

  const presetData = await catchToNull(fetchInputPresetById(id));
  if (!presetData) notFound();

  const ipData = presetData as InputPresetWithStats;

  const genResult = await fetchGenerations({ inputPresetId: id, limit: "100" });
  const generations = parseOrFallback(generationSummaryArraySchema, genResult.data, [], "input-preset related generations");

  // Count populated image columns
  let keyedImageCount = 0;
  for (const col of IMAGE_COLUMNS) {
    const val = ipData[col];
    if (val != null && val !== "" && !(Array.isArray(val) && val.length === 0)) keyedImageCount++;
  }
  const imageCount = keyedImageCount + getInputPresetStoredImages(ipData).length;

  const serializedData = {
    ...ipData,
    createdAt: ipData.createdAt ?? ipData.created_at,
    deletedAt: ipData.deletedAt ?? ipData.deleted_at ?? null
  };

  const serializedGenerations = generations.map((generation) => ({
    id: generation.id,
    sceneAccuracyRating: generation.sceneAccuracyRating ?? null,
    productAccuracyRating: generation.productAccuracyRating ?? null,
    createdAt: generation.createdAt,
    outputImageCount: generation.resultCount ?? 0,
    promptVersionName: generation.promptName ?? null
  }));

  const generationCount = ipData.stats?.generationCount ?? ipData.stats?.generation_count ?? generations.length;

  return (
    <InputPresetDetail
      data={serializedData}
      generations={serializedGenerations}
      stats={{
        generationCount,
        imageCount
      }}
    />
  );
}
