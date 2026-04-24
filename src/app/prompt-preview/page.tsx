import { PreviewPromptPage } from '@/components/preview-prompt-page';
import {
  fetchInputPresetsMinimal,
  fetchPromptPreviewDollhouseSource,
  fetchPromptVersionsMinimal,
} from '@/lib/service-client';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{
    prompt_version_id?: string;
    preset_id?: string;
    area_summary?: string;
  }>;
}

export default async function PreviewPromptRoute({ searchParams }: PageProps) {
  const params = await searchParams;
  const [promptVersions, presets, dollhouseSource] = await Promise.all([
    fetchPromptVersionsMinimal(100),
    fetchInputPresetsMinimal(100),
    fetchPromptPreviewDollhouseSource(),
  ]);
  return (
    <PreviewPromptPage
      initialPromptVersionId={params.prompt_version_id ?? null}
      initialPresetId={params.preset_id ?? null}
      initialAreaSummary={params.area_summary ?? dollhouseSource.defaultAreaSummary}
      initialPromptVersions={promptVersions}
      initialPresets={presets}
      initialDollhouseSource={dollhouseSource}
    />
  );
}
