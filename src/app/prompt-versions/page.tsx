import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { PromptVersionsList } from "@/components/prompt-versions-list";
import { LinkButton } from "@/components/ui/button";
import { PlusIcon } from "@/components/ui/icons";

export const metadata: Metadata = {
  title: "Prompt Versions",
  description: "Manage versioned prompts for image generation."
};

export const dynamic = "force-dynamic";

export default function PromptVersionsPage() {
  return (
    <div>
      <PageHeader
        title="Prompt Versions"
        subtitle="Manage versioned prompts for image generation."
        actions={
          <LinkButton href="/prompt-versions/new" iconLeft={<PlusIcon className="size-4" />}>
            New Prompt Version
          </LinkButton>
        }
      />
      <PromptVersionsList />
    </div>
  );
}
