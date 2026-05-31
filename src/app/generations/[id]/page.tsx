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

interface GenerationSceneInput {
  dollhouseView?: unknown;
  realPhoto?: unknown;
  moodBoard?: unknown;
}

export default async function GenerationDetailPage({ params }: PageProps) {
  const { id } = await params;

  const data = await fetchGenerationById(id).catch(() => null);
  if (!data) notFound();

  const { promptVersion, input } = data;
  const inputData = input ?? null;
  const results: ResultImage[] = data.results;

  const { activeProductCategories, productImages } = deriveProductImages(inputData);

  const sceneAccuracyRating = data.sceneAccuracyRating ?? null;
  const productAccuracyRating = data.productAccuracyRating ?? null;
  const executionTime = data.executionTime ?? null;
  const { createdAt } = data;
  const notes = data.notes ?? null;

  const sceneInput = inputData as GenerationSceneInput | null;
  const dollhouseView = typeof sceneInput?.dollhouseView === "string" ? sceneInput.dollhouseView : undefined;
  const realPhoto = typeof sceneInput?.realPhoto === "string" ? sceneInput.realPhoto : undefined;
  const moodBoard = typeof sceneInput?.moodBoard === "string" ? sceneInput.moodBoard : undefined;

  const hasNotes = Boolean(notes);
  const hasSceneImages = Boolean(dollhouseView || realPhoto || moodBoard);
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
            <Link href={`/prompt-versions/${String(promptVersion?.id)}`} className="text-primary-600 hover:text-primary-500 inline-flex items-center gap-1">
              {promptVersion?.name || "Untitled"}
              <ExternalLinkIcon className="size-3.5" />
            </Link>
          </span>
        }
        actions={
          <>
            <RatingBadge rating={sceneAccuracyRating} label="Scene" />
            <RatingBadge rating={productAccuracyRating} label="Product" />
            <DeleteGenerationButton generationId={data.id} />
          </>
        }
      />

      <RatingSection generationId={data.id} sceneAccuracyRating={sceneAccuracyRating} productAccuracyRating={productAccuracyRating} />

      <OutputImagesSection results={results} activeProductCategories={activeProductCategories} />

      <MetadataSection createdAt={createdAt} executionTime={executionTime} resultCount={results.length} notes={notes} />

      <SceneImagesSection dollhouseView={dollhouseView} realPhoto={realPhoto} moodBoard={moodBoard} />

      <ProductImagesSection productImages={productImages} />

      <PromptsSection systemPrompt={promptVersion?.systemPrompt ?? undefined} userPrompt={promptVersion?.userPrompt ?? undefined} />
    </div>
  );
}
