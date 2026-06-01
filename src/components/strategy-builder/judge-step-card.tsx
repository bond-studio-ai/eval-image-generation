"use client";

import { PlusIcon, TrashIcon, XIcon } from "@/components/ui/icons";
import type { PromptVersionListItem } from "@/lib/types";
import { CandidatePicker } from "./candidate-picker";
import { ModelSelect } from "./model-select";
import { PromptVersionSelector } from "./prompt-version-selector";
import { JUDGE_TYPES, type ModelOption, nextUid, type StepData } from "./types";

export function JudgeStepCard({
  step,
  idx,
  updateStep,
  removeStep,
  promptVersions,
  judgeModels,
  defaultJudgeModel
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
    <div className="border-warning-200 bg-warning-50/50 rounded-lg border p-5 shadow-xs">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="bg-warning-100 text-warning-700 text-caption inline-flex shrink-0 items-center justify-center rounded-full px-2.5 py-0.5 font-semibold">Step {idx + 1} &mdash; Judge</span>
          <CandidatePicker
            value={step.number_of_images ?? 4}
            onChange={(n) => {
              updateStep(idx, { number_of_images: n });
            }}
          />
        </div>
        <button
          type="button"
          onClick={() => {
            removeStep(idx);
          }}
          aria-label="Remove step"
          className="text-text-muted hover:bg-danger-50 hover:text-danger-600 rounded p-1"
        >
          <TrashIcon className="size-4" />
        </button>
      </div>
      <p className="text-warning-700 text-caption mt-2">Runs the preceding step {step.number_of_images ?? 4} times, evaluates results, and picks the best one.</p>

      <div className="mt-4 space-y-3">
        {(step.judges ?? []).map((judge, jIdx) => (
          <div key={judge._uid} className="border-warning-200 bg-surface rounded-lg border p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="bg-warning-100 text-warning-700 text-caption inline-flex size-6 items-center justify-center rounded-full font-bold">{jIdx + 1}</span>
              <div className="flex items-center gap-2">
                {JUDGE_TYPES.map((jt) => (
                  <label
                    key={jt.value}
                    title={jt.description}
                    className={`text-caption cursor-pointer rounded-md border px-2.5 py-1 transition-colors ${judge.judge_type === jt.value ? "border-warning-300 bg-warning-50 text-warning-800 font-medium" : "border-border bg-surface text-text-muted hover:border-border-strong"}`}
                  >
                    <input
                      type="radio"
                      name={`judge_type_${idx}_${jIdx}`}
                      value={jt.value}
                      checked={judge.judge_type === jt.value}
                      onChange={() => {
                        const newJudges = Array.from(step.judges ?? []);
                        const existing = newJudges[jIdx];
                        if (!existing) return;
                        newJudges[jIdx] = { ...existing, judge_type: jt.value };
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
                  className="text-text-muted hover:bg-danger-50 hover:text-danger-500 rounded p-1"
                >
                  <XIcon className="size-4" />
                </button>
              )}
            </div>
            <div className="mb-3">
              <label htmlFor={`judge-name-${idx}-${jIdx}`} className="text-text-secondary text-caption mb-1 block font-medium">
                Name (optional)
              </label>
              <input
                id={`judge-name-${idx}-${jIdx}`}
                type="text"
                aria-label="Judge name"
                value={judge.name ?? ""}
                onChange={(e) => {
                  const newJudges = Array.from(step.judges ?? []);
                  const existing = newJudges[jIdx];
                  if (!existing) return;
                  newJudges[jIdx] = { ...existing, name: e.target.value };
                  updateStep(idx, { judges: newJudges });
                }}
                placeholder="e.g. Scene Accuracy"
                className="focus:border-primary-500 focus:ring-primary-500 border-border-strong text-body w-full rounded-lg border px-2 py-1.5 focus:ring-1 focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor={`judge-model-${idx}-${jIdx}`} className="text-text-secondary text-caption mb-1 block font-medium">
                  Model
                </label>
                <ModelSelect
                  id={`judge-model-${idx}-${jIdx}`}
                  value={judge.judge_model}
                  options={judgeModels}
                  onChange={(value) => {
                    const newJudges = Array.from(step.judges ?? []);
                    const existing = newJudges[jIdx];
                    if (!existing) return;
                    newJudges[jIdx] = { ...existing, judge_model: value };
                    updateStep(idx, { judges: newJudges });
                  }}
                />
              </div>
              <div>
                <label htmlFor={`judge-prompt-${idx}-${jIdx}`} className="text-text-secondary text-caption mb-1 block font-medium">
                  Prompt
                </label>
                <PromptVersionSelector
                  id={`judge-prompt-${idx}-${jIdx}`}
                  value={judge.judge_prompt_version_id}
                  promptVersions={promptVersions}
                  onChange={(id) => {
                    const newJudges = Array.from(step.judges ?? []);
                    const existing = newJudges[jIdx];
                    if (!existing) return;
                    newJudges[jIdx] = { ...existing, judge_prompt_version_id: id };
                    updateStep(idx, { judges: newJudges });
                  }}
                />
              </div>
            </div>
            <div className="mt-3">
              <label htmlFor={`judge-tolerance-${idx}-${jIdx}`} className="text-text-secondary text-caption mb-1 flex items-center justify-between font-medium">
                <span>Tolerance</span>
                <span className="text-text-primary tabular-nums">
                  {judge.tolerance_threshold}
                  <span className="text-text-disabled ml-0.5">/100</span>
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
                  const newJudges = Array.from(step.judges ?? []);
                  const existing = newJudges[jIdx];
                  if (!existing) return;
                  newJudges[jIdx] = {
                    ...existing,
                    tolerance_threshold: Number(e.target.value)
                  };
                  updateStep(idx, { judges: newJudges });
                }}
                className="accent-warning-500 w-full"
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
                name: "",
                judge_model: defaultJudgeModel,
                judge_type: "individual" as const,
                judge_prompt_version_id: "",
                tolerance_threshold: 1
              }
            ];
            updateStep(idx, { judges: newJudges });
          }}
          className="border-warning-300 bg-surface text-warning-700 hover:bg-warning-50 text-caption inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-medium transition-colors"
        >
          <PlusIcon className="size-3.5" />
          Add Judge
        </button>
      </div>
    </div>
  );
}
