import { PreviewPromptPage } from '@/components/preview-prompt-page';
import { fetchInputPresetsMinimal, fetchPromptVersionsMinimal } from '@/lib/queries';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ prompt_version_id?: string; preset_id?: string }>;
}

export default async function PreviewPromptRoute({ searchParams }: PageProps) {
  const params = await searchParams;
  const [promptVersions, presets] = await Promise.all([
    fetchPromptVersionsMinimal(100),
    fetchInputPresetsMinimal(100),
  ]);
  return (
    <PreviewPromptPage
      initialPromptVersionId={params.prompt_version_id ?? null}
      initialPresetId={params.preset_id ?? null}
      initialPromptVersions={promptVersions}
      initialPresets={presets}
    />
  );
}
