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
    <div>
      <h1 className="text-2xl font-bold text-gray-900">New Strategy</h1>
      <p className="mt-1 text-sm text-gray-600">
        Define a multi-step generation workflow.
      </p>
      <div className="mt-6">
        <StrategyBuilder
          promptVersions={promptVersions}
          inputPresets={inputPresets}
          models={models}
        />
      </div>
    </div>
  );
}
