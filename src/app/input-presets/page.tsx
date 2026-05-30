import { InputPresetsList } from '@/components/input-presets-list';
import { PageHeader, PrimaryLinkButton } from '@/components/page-header';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Input Presets' };

export default function InputPresetsPage() {
  return (
    <div>
      <PageHeader
        title="Input Presets"
        subtitle="Manage reusable sets of input images for generation."
        actions={
          <PrimaryLinkButton href="/input-presets/new" icon>
            New Input Preset
          </PrimaryLinkButton>
        }
      />
      <InputPresetsList />
    </div>
  );
}
