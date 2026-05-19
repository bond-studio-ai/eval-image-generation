import { fetchInputPresets, fetchPromptVersions, fetchStrategyModelCatalog } from '@/lib/service-client';
import { StrategyBuilder } from '@/components/strategy-builder';

export const dynamic = 'force-dynamic';

export default async function NewStrategyPage() {
  const [promptVersions, inputPresets, modelCatalog] = await Promise.all([
    fetchPromptVersions(100),
    fetchInputPresets(100),
    fetchStrategyModelCatalog(),
  ]);

  return (
    <StrategyBuilder
      promptVersions={promptVersions}
      inputPresets={inputPresets}
      modelCatalog={modelCatalog}
    />
  );
}
