import { fetchLatestImageSelection, fetchPromptVersionById, fetchPromptVersions } from '@/lib/queries';
import { GeneratePageContent } from './generate-page-content';

interface PageProps {
  searchParams: Promise<{ prompt_version_id?: string }>;
}

export default async function GeneratePage({ searchParams }: PageProps) {
  const { prompt_version_id } = await searchParams;

  // Fetch all initial data in parallel on the server
  const [promptVersions, imageSelection, promptVersion] = await Promise.all([
    fetchPromptVersions(100),
    fetchLatestImageSelection(),
    prompt_version_id ? fetchPromptVersionById(prompt_version_id) : Promise.resolve(null),
  ]);

  return (
    <GeneratePageContent
      initialPromptVersions={promptVersions}
      initialImageSelection={imageSelection}
      initialPromptVersion={promptVersion}
      initialPromptVersionId={prompt_version_id ?? null}
    />
  );
}
