"use client";

import { PencilIcon, TrashIcon } from "@/components/ui/icons";
import type { PromptVersionListItem } from "@/lib/types";
import { ProductImageTypeOverrides } from "./product-image-type-overrides";
import { PromptVersionSelector } from "./prompt-version-selector";
import type { StepData } from "./types";

export function GenerationStepCard({
  step,
  idx,
  stepsLength,
  updateStep,
  removeStep,
  promptVersions
}: {
  step: StepData;
  idx: number;
  stepsLength: number;
  updateStep: (idx: number, partial: Partial<StepData>) => void;
  removeStep: (idx: number) => void;
  promptVersions: PromptVersionListItem[];
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-xs">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="bg-primary-100 text-primary-700 inline-flex shrink-0 items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-semibold">Step {idx + 1}</span>
          <div className="relative">
            <input
              type="text"
              value={step.name}
              onChange={(e) => updateStep(idx, { name: e.target.value })}
              placeholder="Name this step..."
              aria-label="Step name"
              className="focus:border-primary-500 focus:ring-primary-500 w-56 rounded-lg border border-gray-300 bg-gray-50 py-1.5 pr-8 pl-3 text-sm font-medium text-gray-800 transition-colors placeholder:text-gray-400 hover:border-gray-400 hover:bg-white focus:bg-white focus:ring-1 focus:outline-none"
            />
            <PencilIcon className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-gray-400" />
          </div>
        </div>
        {stepsLength > 1 && (
          <button type="button" onClick={() => removeStep(idx)} aria-label="Remove step" className="text-text-muted rounded p-1 hover:bg-red-50 hover:text-red-600">
            <TrashIcon className="size-4" />
          </button>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Prompt */}
        <div>
          <label htmlFor={`step-prompt-version-${idx}`} className="mb-1 block text-xs font-medium text-gray-600">
            Prompt Version
          </label>
          <PromptVersionSelector id={`step-prompt-version-${idx}`} value={step.prompt_version_id} promptVersions={promptVersions} onChange={(id) => updateStep(idx, { prompt_version_id: id })} />
        </div>
      </div>

      {/* Include from run presets: what to pull for this step (presets are chosen when you run) */}
      <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
        <p className="mb-3 text-xs font-medium text-gray-700">Include from run presets</p>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-4">
            {(
              [
                {
                  key: "include_dollhouse",
                  override: "dollhouse_view_from_step",
                  label: "Dollhouse"
                },
                {
                  key: "include_real_photo",
                  override: "real_photo_from_step",
                  label: "Real Life"
                },
                {
                  key: "include_mood_board",
                  override: "mood_board_from_step",
                  label: "Mood Board"
                }
              ] as const
            ).map(({ key, override, label }) => {
              const overridden = step[override] != null;
              return (
                <label key={key} className={`flex items-center gap-2 text-sm ${overridden ? "cursor-not-allowed text-gray-400" : "cursor-pointer text-gray-700"}`}>
                  <input
                    type="checkbox"
                    checked={overridden ? false : step[key]}
                    disabled={overridden}
                    onChange={(e) => updateStep(idx, { [key]: e.target.checked })}
                    className="text-primary-600 focus:ring-primary-500 rounded border-gray-300 disabled:opacity-50"
                  />
                  {label}
                  {overridden && <span className="text-xs text-amber-600">(from step {step[override]})</span>}
                </label>
              );
            })}
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={step.include_product_images} onChange={(e) => updateStep(idx, { include_product_images: e.target.checked })} className="text-primary-600 focus:ring-primary-500 rounded border-gray-300" />
            Product images
          </label>
        </div>
      </div>

      {/* Product Image Type Overrides */}
      {step.include_product_images && <ProductImageTypeOverrides value={step.product_image_types} onChange={(v) => updateStep(idx, { product_image_types: v })} />}

      {/* Scene Field Overrides (only for step 2+) */}
      {idx > 0 && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="mb-2 text-xs font-medium text-amber-800">Use output from a previous step as scene input</p>
          <div className="grid grid-cols-3 gap-3">
            {(
              [
                {
                  field: "dollhouse_view_from_step",
                  includeKey: "include_dollhouse",
                  label: "Dollhouse View"
                },
                {
                  field: "real_photo_from_step",
                  includeKey: "include_real_photo",
                  label: "Real Photo"
                },
                {
                  field: "mood_board_from_step",
                  includeKey: "include_mood_board",
                  label: "Mood Board"
                }
              ] as const
            ).map(({ field, includeKey, label }) => (
              <div key={field}>
                <label className="mb-1 block text-xs text-amber-700">{label}</label>
                <select
                  value={step[field] ?? ""}
                  onChange={(e) => {
                    const val = e.target.value ? Number(e.target.value) : null;
                    const updates: Record<string, unknown> = { [field]: val };
                    if (val != null) updates[includeKey] = false;
                    updateStep(idx, updates);
                  }}
                  className="w-full rounded border border-amber-300 bg-white px-2 py-1 text-xs focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                >
                  <option value="">-- None --</option>
                  {Array.from({ length: idx }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      Step {i + 1} output
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Include output from previous step as arbitrary image (step 2+) */}
      {idx > 0 && (
        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
          <p className="mb-2 text-xs font-medium text-blue-800">Include output from a previous step as extra image</p>
          <div className="max-w-xs">
            <select
              value={step.arbitrary_image_from_step ?? ""}
              onChange={(e) =>
                updateStep(idx, {
                  arbitrary_image_from_step: e.target.value ? Number(e.target.value) : null
                })
              }
              className="w-full rounded border border-blue-300 bg-white px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">-- None --</option>
              {Array.from({ length: idx }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  Step {i + 1} output
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
