'use client';

import type { PromptVersionListItem } from '@/lib/types';
import { CandidatePicker } from './candidate-picker';
import { PromptVersionSelector } from './prompt-version-selector';
import { SearchableSelect } from './searchable-select';
import { JUDGE_TYPES, nextUid, type ModelOption, type StepData } from './types';

export function JudgeStepCard({
  step,
  idx,
  updateStep,
  removeStep,
  promptVersions,
  judgeModels,
  defaultJudgeModel,
}: {
  step: StepData;
  idx: number;
  updateStep: (idx: number, partial: Partial<StepData>) => void;
  removeStep: (idx: number) => void;
  promptVersions: PromptVersionListItem[];
  judgeModels: ModelOption[];
  defaultJudgeModel: string;
}) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-5 shadow-xs">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex shrink-0 items-center justify-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
            Step {idx + 1} &mdash; Judge
          </span>
          <CandidatePicker
            value={step.number_of_images ?? 4}
            onChange={(n) => updateStep(idx, { number_of_images: n })}
          />
        </div>
        <button
          type="button"
          onClick={() => removeStep(idx)}
          aria-label="Remove step"
          className="text-text-muted rounded p-1 hover:bg-red-50 hover:text-red-600"
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
              d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
            />
          </svg>
        </button>
      </div>
      <p className="mt-2 text-xs text-amber-700">
        Runs the preceding step {step.number_of_images ?? 4} times, evaluates results, and picks the
        best one.
      </p>

      <div className="mt-4 space-y-3">
        {(step.judges ?? []).map((judge, jIdx) => (
          <div key={judge._uid} className="rounded-lg border border-amber-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="inline-flex size-6 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">
                {jIdx + 1}
              </span>
              <div className="flex items-center gap-2">
                {JUDGE_TYPES.map((jt) => (
                  <label
                    key={jt.value}
                    title={jt.description}
                    className={`cursor-pointer rounded-md border px-2.5 py-1 text-xs transition-colors ${judge.judge_type === jt.value ? 'border-amber-300 bg-amber-50 font-medium text-amber-800' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'}`}
                  >
                    <input
                      type="radio"
                      name={`judge_type_${idx}_${jIdx}`}
                      value={jt.value}
                      checked={judge.judge_type === jt.value}
                      onChange={() => {
                        const newJudges = [...(step.judges ?? [])];
                        newJudges[jIdx] = { ...newJudges[jIdx], judge_type: jt.value };
                        updateStep(idx, { judges: newJudges });
                      }}
                      className="sr-only"
                    />
                    {jt.label}
                  </label>
                ))}
              </div>
              {(step.judges ?? []).length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    const newJudges = (step.judges ?? []).filter((_, i) => i !== jIdx);
                    updateStep(idx, { judges: newJudges });
                  }}
                  aria-label="Remove judge"
                  className="text-text-muted rounded p-1 hover:bg-red-50 hover:text-red-500"
                >
                  <svg
                    className="size-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            <div className="mb-3">
              <label
                htmlFor={`judge-name-${idx}-${jIdx}`}
                className="mb-1 block text-xs font-medium text-gray-600"
              >
                Name (optional)
              </label>
              <input
                id={`judge-name-${idx}-${jIdx}`}
                type="text"
                aria-label="Judge name"
                value={judge.name ?? ''}
                onChange={(e) => {
                  const newJudges = [...(step.judges ?? [])];
                  newJudges[jIdx] = { ...newJudges[jIdx], name: e.target.value };
                  updateStep(idx, { judges: newJudges });
                }}
                placeholder="e.g. Scene Accuracy"
                className="focus:border-primary-500 focus:ring-primary-500 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:ring-1 focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor={`judge-model-${idx}-${jIdx}`}
                  className="mb-1 block text-xs font-medium text-gray-600"
                >
                  Model
                </label>
                <SearchableSelect
                  id={`judge-model-${idx}-${jIdx}`}
                  value={judge.judge_model}
                  options={judgeModels}
                  onChange={(v) => {
                    const newJudges = [...(step.judges ?? [])];
                    newJudges[jIdx] = { ...newJudges[jIdx], judge_model: v };
                    updateStep(idx, { judges: newJudges });
                  }}
                />
              </div>
              <div>
                <label
                  htmlFor={`judge-prompt-${idx}-${jIdx}`}
                  className="mb-1 block text-xs font-medium text-gray-600"
                >
                  Prompt
                </label>
                <PromptVersionSelector
                  id={`judge-prompt-${idx}-${jIdx}`}
                  value={judge.judge_prompt_version_id}
                  promptVersions={promptVersions}
                  onChange={(id) => {
                    const newJudges = [...(step.judges ?? [])];
                    newJudges[jIdx] = { ...newJudges[jIdx], judge_prompt_version_id: id };
                    updateStep(idx, { judges: newJudges });
                  }}
                />
              </div>
            </div>
            <div className="mt-3">
              <label
                htmlFor={`judge-tolerance-${idx}-${jIdx}`}
                className="mb-1 flex items-center justify-between text-xs font-medium text-gray-600"
              >
                <span>Tolerance</span>
                <span className="text-gray-900 tabular-nums">
                  {judge.tolerance_threshold}
                  <span className="ml-0.5 text-gray-400">/100</span>
                </span>
              </label>
              <input
                id={`judge-tolerance-${idx}-${jIdx}`}
                type="range"
                aria-label="Judge tolerance threshold"
                min={1}
                max={100}
                value={judge.tolerance_threshold}
                onChange={(e) => {
                  const newJudges = [...(step.judges ?? [])];
                  newJudges[jIdx] = {
                    ...newJudges[jIdx],
                    tolerance_threshold: Number(e.target.value),
                  };
                  updateStep(idx, { judges: newJudges });
                }}
                className="w-full accent-amber-500"
              />
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => {
            const newJudges = [
              ...(step.judges ?? []),
              {
                _uid: nextUid(),
                name: '',
                judge_model: defaultJudgeModel,
                judge_type: 'individual' as const,
                judge_prompt_version_id: '',
                tolerance_threshold: 1,
              },
            ];
            updateStep(idx, { judges: newJudges });
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-50"
        >
          <svg
            className="size-3.5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Judge
        </button>
      </div>
    </div>
  );
}
