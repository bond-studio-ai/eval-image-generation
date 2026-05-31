import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { StrategyBuilder } from "@/components/strategy-builder";
import { fetchInputPresets, fetchPromptVersions, fetchStrategyById, fetchStrategyModelCatalog } from "@/lib/service-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Edit Strategy" };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditStrategyPage({ params }: PageProps) {
  const { id } = await params;

  const [strat, promptVersions, inputPresets, modelCatalog] = await Promise.all([fetchStrategyById(id), fetchPromptVersions(100), fetchInputPresets(100), fetchStrategyModelCatalog()]);

  if (!strat) {
    notFound();
  }

  return (
    <div>
      <PageHeader backHref={`/strategies/${id}`} backLabel={`Back to ${strat.name}`} title="Edit Strategy" />
      <div className="mt-6">
        <StrategyBuilder
          strategyId={strat.id}
          initialName={strat.name}
          initialDescription={strat.description ?? ""}
          initialStrategySettings={{
            model: strat.model,
            aspect_ratio: strat.aspectRatio,
            output_resolution: strat.outputResolution,
            temperature: strat.temperature ? Number(strat.temperature) : 1,
            use_google_search: strat.useGoogleSearch,
            tag_images: strat.tagImages,
            group_product_images: strat.groupProductImages ?? false,
            check_scene_accuracy: strat.checkSceneAccuracy ?? false,
            enable_multi_turn_context: strat.enableMultiTurnContext ?? false
          }}
          initialPreviewSettings={{
            preview_model: strat.previewModel ?? null,
            preview_resolution: strat.previewResolution ?? "512"
          }}
          initialSteps={strat.steps.map((step) => ({
            id: step.id,
            type: step.type ?? "generation",
            ...(step.numberOfImages == null ? {} : { number_of_images: step.numberOfImages }),
            name: step.name ?? "",
            prompt_version_id: step.promptVersionId ?? "",
            model: step.model,
            aspect_ratio: step.aspectRatio,
            output_resolution: step.outputResolution,
            temperature: step.temperature ? Number(step.temperature) : 1,
            use_google_search: step.useGoogleSearch,
            tag_images: step.tagImages,
            dollhouse_view_from_step: step.dollhouseViewFromStep,
            real_photo_from_step: step.realPhotoFromStep,
            mood_board_from_step: step.moodBoardFromStep,
            include_dollhouse: step.includeDollhouse ?? true,
            include_real_photo: step.includeRealPhoto ?? true,
            include_mood_board: step.includeMoodBoard ?? true,
            include_product_images: step.includeProductImages ?? true,
            include_product_categories: step.includeProductCategories ?? [],
            product_image_types: (step.productImageTypes ?? {}) as Record<string, "featured-image" | "photo-image" | "line-drawing" | "tear-sheet">,
            arbitrary_image_from_step: step.arbitraryImageFromStep,
            ...(step.type === "judge"
              ? {
                  judges: (step.judges ?? []).map((j) => ({
                    id: j.id,
                    name: j.name ?? "",
                    judge_model: j.judgeModel,
                    judge_type: j.judgeType,
                    judge_prompt_version_id: j.judgePromptVersionId,
                    tolerance_threshold: j.toleranceThreshold
                  }))
                }
              : {})
          }))}
          promptVersions={promptVersions}
          inputPresets={inputPresets}
          modelCatalog={modelCatalog}
        />
      </div>
    </div>
  );
}
