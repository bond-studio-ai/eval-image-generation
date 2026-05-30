import type { Metadata } from "next";
import { InputPresetsList } from "@/components/input-presets-list";
import { PageHeader } from "@/components/page-header";
import { LinkButton } from "@/components/ui/button";
import { PlusIcon } from "@/components/ui/icons";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Input Presets" };

export default function InputPresetsPage() {
  return (
    <div>
      <PageHeader
        title="Input Presets"
        subtitle="Manage reusable sets of input images for generation."
        actions={
          <LinkButton href="/input-presets/new" iconLeft={<PlusIcon className="size-4" />}>
            New Input Preset
          </LinkButton>
        }
      />
      <InputPresetsList />
    </div>
  );
}
