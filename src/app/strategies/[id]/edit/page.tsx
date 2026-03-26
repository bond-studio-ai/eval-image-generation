import { StrategyBuilder } from '@/components/strategy-builder';
import { fetchInputPresets, fetchModels, fetchPromptVersions, fetchStrategyById } from '@/lib/service-client';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditStrategyPage({ params }: PageProps) {
  const { id } = await params;

  const [strat, promptVersions, inputPresets, models] = await Promise.all([
    fetchStrategyById(id),
    fetchPromptVersions(100),
    fetchInputPresets(100),
    fetchModels(),
  ]);

  if (!strat) {
    notFound();
  }

  return (
    <div>
      <Link href={`/strategies/${id}`} className="text-sm text-gray-600 hover:text-gray-900">
        &larr; Back to {strat.name}
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-gray-900">Edit Strategy</h1>
      <div className="mt-6">
        <StrategyBuilder
          strategyId={strat.id}
          initialName={strat.name}
          initialDescription={strat.description ?? ''}
          initialStrategySettings={{
            model: strat.model,
            aspect_ratio: strat.aspectRatio,
            output_resolution: strat.outputResolution,
            temperature: strat.temperature ? Number(strat.temperature) : 1.0,
            use_google_search: strat.useGoogleSearch,
            tag_images: strat.tagImages,
            group_product_images: strat.groupProductImages ?? false,
          }}
          initialPreviewSettings={{
            preview_model: strat.previewModel ?? null,
            preview_resolution: strat.previewResolution ?? '512',
          }}
          initialJudges={(strat.judges ?? []).map((j) => ({
            id: j.id,
            judge_model: j.judgeModel,
            judge_type: j.judgeType as 'batch' | 'individual',
            judge_prompt_version_id: j.judgePromptVersionId,
            weight: j.weight,
            tolerance_threshold: j.toleranceThreshold,
          }))}
          initialSteps={strat.steps.map((s) => ({
            id: s.id,
            name: s.name ?? '',
            prompt_version_id: s.promptVersionId,
            model: s.model,
            aspect_ratio: s.aspectRatio,
            output_resolution: s.outputResolution,
            temperature: s.temperature ? Number(s.temperature) : 1.0,
            use_google_search: s.useGoogleSearch,
            tag_images: s.tagImages,
            dollhouse_view_from_step: s.dollhouseViewFromStep,
            real_photo_from_step: s.realPhotoFromStep,
            mood_board_from_step: s.moodBoardFromStep,
            include_dollhouse: s.includeDollhouse ?? true,
            include_real_photo: s.includeRealPhoto ?? true,
            include_mood_board: s.includeMoodBoard ?? true,
            include_product_images: s.includeProductImages ?? true,
            include_product_categories: s.includeProductCategories ?? [],
            arbitrary_image_from_step: s.arbitraryImageFromStep,
          }))}
          promptVersions={promptVersions}
          inputPresets={inputPresets}
          models={models}
        />
      </div>
    </div>
  );
}
