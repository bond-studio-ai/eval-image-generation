'use client';

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
          <svg
            className="size-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Generation Step
        </button>
        <button
          type="button"
          onClick={addJudgeStep}
          disabled={steps.length === 0 || steps[steps.length - 1]?.type === 'judge'}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg border-2 border-dashed border-amber-300 px-4 py-3 text-sm font-medium text-amber-700 transition-colors hover:border-amber-400 hover:text-amber-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <svg
            className="size-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 01-2.031.352 5.989 5.989 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971z"
            />
          </svg>
          Add Judge Step
        </button>
      </div>
    </div>
  );
}
