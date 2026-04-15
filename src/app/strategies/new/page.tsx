import { fetchInputPresets, fetchModels, fetchPromptVersions } from '@/lib/service-client';
import { StrategyBuilder } from '@/components/strategy-builder';

export const dynamic = 'force-dynamic';

export default async function NewStrategyPage() {
  const [promptVersions, inputPresets, models] = await Promise.all([
    fetchPromptVersions(100),
    fetchInputPresets(100),
    fetchModels(),
  ]);

  return (
    <StrategyBuilder
      promptVersions={promptVersions}
      inputPresets={inputPresets}
      models={models}
    />
  );
}
