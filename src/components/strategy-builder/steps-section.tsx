'use client';

import { PlusIcon, ScaleIcon } from '@/components/ui/icons';
import type { PromptVersionListItem } from '@/lib/types';
import { GenerationStepCard } from './generation-step-card';
import { JudgeStepCard } from './judge-step-card';
import type { ModelOption, StepData } from './types';

export function StepsSection({
  steps,
  updateStep,
  removeStep,
  addStep,
  addJudgeStep,
  promptVersions,
  judgeModels,
  defaultJudgeModel,
}: {
  steps: StepData[];
  updateStep: (idx: number, partial: Partial<StepData>) => void;
  removeStep: (idx: number) => void;
  addStep: () => void;
  addJudgeStep: () => void;
  promptVersions: PromptVersionListItem[];
  judgeModels: ModelOption[];
  defaultJudgeModel: string;
}) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-gray-900 uppercase">Steps</h2>
      <div className="mt-3 space-y-4">
        {steps.map((step, idx) =>
          step.type === 'judge' ? (
            <JudgeStepCard
              key={step._uid}
              step={step}
              idx={idx}
              updateStep={updateStep}
              removeStep={removeStep}
              promptVersions={promptVersions}
              judgeModels={judgeModels}
              defaultJudgeModel={defaultJudgeModel}
            />
          ) : (
            <GenerationStepCard
              key={step._uid}
              step={step}
              idx={idx}
              stepsLength={steps.length}
              updateStep={updateStep}
              removeStep={removeStep}
              promptVersions={promptVersions}
            />
          ),
        )}
      </div>

      <div className="mt-4 flex gap-3">
        <button
          type="button"
          onClick={addStep}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 px-4 py-3 text-sm font-medium text-gray-600 transition-colors hover:border-gray-400 hover:text-gray-800"
        >
          <PlusIcon className="size-4" />
          Add Generation Step
        </button>
        <button
          type="button"
          onClick={addJudgeStep}
          disabled={steps.length === 0 || steps[steps.length - 1]?.type === 'judge'}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg border-2 border-dashed border-amber-300 px-4 py-3 text-sm font-medium text-amber-700 transition-colors hover:border-amber-400 hover:text-amber-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ScaleIcon className="size-4" />
          Add Judge Step
        </button>
      </div>
    </div>
  );
}
