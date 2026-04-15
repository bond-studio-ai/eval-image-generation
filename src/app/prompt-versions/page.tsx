import { PageHeader, PrimaryLinkButton } from '@/components/page-header';
import { PromptVersionsList } from '@/components/prompt-versions-list';

export const dynamic = 'force-dynamic';

export default function PromptVersionsPage() {
  return (
    <div>
      <PageHeader
        title="Prompt Versions"
        subtitle="Manage versioned prompts for image generation."
        actions={<PrimaryLinkButton href="/prompt-versions/new" icon>New Prompt Version</PrimaryLinkButton>}
      />
      <PromptVersionsList />
    </div>
  );
}
