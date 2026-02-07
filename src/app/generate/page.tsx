import { auth } from '@/lib/auth/server';
import { fetchImageSelectionByUser, fetchPromptVersionById, fetchPromptVersions } from '@/lib/queries';
import { redirect } from 'next/navigation';
import { GeneratePageContent } from './generate-page-content';

interface PageProps {
  searchParams: Promise<{ prompt_version_id?: string }>;
}

export default async function GeneratePage({ searchParams }: PageProps) {
  const [{ prompt_version_id }, { data: session }] = await Promise.all([
    searchParams,
    auth.getSession(),
  ]);

  if (!session?.user) {
    redirect('/auth/sign-in');
  }

  // Fetch all initial data in parallel on the server
  const [promptVersions, imageSelection, promptVersion] = await Promise.all([
    fetchPromptVersions(100),
    fetchImageSelectionByUser(session.user.id),
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
