import { PreviewPromptPage } from '@/components/preview-prompt-page';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ prompt_version_id?: string; preset_id?: string }>;
}

export default async function PreviewPromptRoute({ searchParams }: PageProps) {
  const params = await searchParams;
  return (
    <PreviewPromptPage
      initialPromptVersionId={params.prompt_version_id ?? null}
      initialPresetId={params.preset_id ?? null}
    />
  );
}
