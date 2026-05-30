import type { Metadata } from 'next';
import { PreviewPromptPage } from '@/components/preview-prompt-page';
import {
  fetchInputPresetsMinimal,
  fetchPromptPreviewDollhouseSource,
  fetchPromptVersionsMinimal,
} from '@/lib/service-client';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Prompt Preview',
  description: 'Preview rendered prompts against input presets and prompt versions.',
};

interface PageProps {
  searchParams: Promise<{
    prompt_version_id?: string;
    preset_id?: string;
    area_summary?: string;
  }>;
}

export default async function PreviewPromptRoute({ searchParams }: PageProps) {
  const [params, promptVersions, presets, dollhouseSource] = await Promise.all([
    searchParams,
    fetchPromptVersionsMinimal(100),
    fetchInputPresetsMinimal(100),
    fetchPromptPreviewDollhouseSource().catch(() => null),
  ]);
  return (
    <PreviewPromptPage
      initialPromptVersionId={params.prompt_version_id ?? null}
      initialPresetId={params.preset_id ?? null}
      initialAreaSummary={params.area_summary ?? dollhouseSource?.defaultAreaSummary ?? null}
      initialPromptVersions={promptVersions}
      initialPresets={presets}
      initialDollhouseSource={dollhouseSource ?? undefined}
    />
  );
}
