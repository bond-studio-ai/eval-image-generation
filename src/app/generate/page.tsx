import { auth } from '@/lib/auth/server';
import {
  fetchImageSelectionByUser,
  fetchInputPresetById,
  fetchInputPresets,
  fetchPromptVersionById,
  fetchPromptVersions,
} from '@/lib/queries';
import { redirect } from 'next/navigation';
import { GeneratePageContent } from './generate-page-content';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ prompt_version_id?: string; input_preset_id?: string }>;
}

export default async function GeneratePage({ searchParams }: PageProps) {
  const [{ prompt_version_id, input_preset_id }, { data: session }] = await Promise.all([
    searchParams,
    auth.getSession(),
  ]);

  if (!session?.user) {
    redirect('/auth/sign-in');
  }

  const [promptVersions, inputPresets, imageSelection, promptVersion, inputPreset] = await Promise.all([
    fetchPromptVersions(100),
    fetchInputPresets(100),
    fetchImageSelectionByUser(session.user.id),
    prompt_version_id ? fetchPromptVersionById(prompt_version_id) : Promise.resolve(null),
    input_preset_id ? fetchInputPresetById(input_preset_id) : Promise.resolve(null),
  ]);

  return (
    <GeneratePageContent
      initialPromptVersions={promptVersions}
      initialInputPresets={inputPresets}
      initialImageSelection={imageSelection}
      initialPromptVersion={promptVersion}
      initialPromptVersionId={prompt_version_id ?? null}
      initialInputPreset={inputPreset}
      initialInputPresetId={input_preset_id ?? null}
    />
  );
}
