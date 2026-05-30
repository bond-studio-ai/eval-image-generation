import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteGenerationButton } from "@/components/delete-generation-button";
import { PageHeader } from "@/components/page-header";
import { RatingBadge } from "@/components/rating-badge";
import { ExternalLinkIcon } from "@/components/ui/icons";
import { fetchGenerationById } from "@/lib/service-client";
import { deriveProductImages } from "./_components/generation-data";
import { MetadataSection } from "./_components/metadata-section";
import { buildNavSections } from "./_components/nav-sections";
import { OutputImagesSection } from "./_components/output-images-section";
import { ProductImagesSection } from "./_components/product-images-section";
import { PromptsSection } from "./_components/prompts-section";
import { RatingSection } from "./_components/rating-section";
import { SceneImagesSection } from "./_components/scene-images-section";
import type { ResultImage } from "./_components/types";
import { SectionNav } from "./section-nav";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Generation",
  description: "Generation detail, results, and evaluation."
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function GenerationDetailPage({ params }: PageProps) {
  const { id } = await params;

  const data = await fetchGenerationById(id).catch(() => null);
  if (!data) notFound();

  const result = data as any;

  const promptVersion = result.promptVersion;
  const inputData = result.input as Record<string, unknown> | null;
  const results: ResultImage[] = result.results ?? [];

  const { activeProductCategories, productImages } = deriveProductImages(inputData);

  const sceneAccuracyRating = result.sceneAccuracyRating ?? null;
  const productAccuracyRating = result.productAccuracyRating ?? null;
  const executionTime = result.executionTime ?? null;
  const createdAt = result.createdAt;
  const notes = result.notes ?? null;

  const dollhouseView = inputData?.dollhouseView as string | undefined;
  const realPhoto = inputData?.realPhoto as string | undefined;
  const moodBoard = inputData?.moodBoard as string | undefined;

  const hasNotes = !!notes;
  const hasSceneImages = !!(dollhouseView || realPhoto || moodBoard);
  const hasProductImages = productImages.length > 0;

  const navSections = buildNavSections({ hasNotes, hasSceneImages, hasProductImages });

  return (
    <div>
      <SectionNav sections={navSections} />

      <PageHeader
        backHref="/executions?tab=generations"
        backLabel="Back to Generations"
        title="Generation Detail"
        subtitle={
          <span>
            Prompt Version:{" "}
            <Link href={`/prompt-versions/${promptVersion?.id}`} className="text-primary-600 hover:text-primary-500 inline-flex items-center gap-1">
              {promptVersion?.name || "Untitled"}
              <ExternalLinkIcon className="size-3.5" />
            </Link>
          </span>
        }
        actions={
          <>
            <RatingBadge rating={sceneAccuracyRating} label="Scene" />
            <RatingBadge rating={productAccuracyRating} label="Product" />
            <DeleteGenerationButton generationId={result.id} />
          </>
        }
      />

      <RatingSection generationId={result.id} sceneAccuracyRating={sceneAccuracyRating} productAccuracyRating={productAccuracyRating} />

      <OutputImagesSection results={results} activeProductCategories={activeProductCategories} />

      <MetadataSection createdAt={createdAt} executionTime={executionTime} resultCount={results.length} notes={notes} />

      <SceneImagesSection dollhouseView={dollhouseView} realPhoto={realPhoto} moodBoard={moodBoard} />

      <ProductImagesSection productImages={productImages} />

      <PromptsSection systemPrompt={promptVersion?.systemPrompt} userPrompt={promptVersion?.userPrompt} />
    </div>
  );
}
