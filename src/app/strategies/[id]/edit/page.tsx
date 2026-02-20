import { StrategyBuilder } from '@/components/strategy-builder';
import { fetchInputPresets, fetchPromptVersions, fetchStrategyById } from '@/lib/queries';
import Link from 'next/link';
import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditStrategyPage({ params }: PageProps) {
  const { id } = await params;

  const [strat, promptVersions, inputPresets] = await Promise.all([
    fetchStrategyById(id),
    fetchPromptVersions(100),
    fetchInputPresets(100),
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
          initialSteps={strat.steps.map((s) => ({
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
            include_product_categories: s.includeProductCategories ?? [],
            arbitrary_image_from_step: s.arbitraryImageFromStep,
          }))}
          promptVersions={promptVersions}
          inputPresets={inputPresets}
        />
      </div>
    </div>
  );
}
