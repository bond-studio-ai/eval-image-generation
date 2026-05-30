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
    <div className="border-border bg-surface rounded-lg border p-5 shadow-xs">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="bg-primary-100 text-primary-700 text-caption inline-flex shrink-0 items-center justify-center rounded-full px-2.5 py-0.5 font-semibold">Step {idx + 1}</span>
          <div className="relative">
            <input
              type="text"
              value={step.name}
              onChange={(e) => updateStep(idx, { name: e.target.value })}
              placeholder="Name this step..."
              aria-label="Step name"
              className="focus:border-primary-500 focus:ring-primary-500 border-border-strong bg-surface-muted text-text-secondary placeholder:text-text-disabled hover:bg-surface focus:bg-surface hover:border-border-strong text-body w-56 rounded-lg border py-1.5 pr-8 pl-3 font-medium transition-colors focus:ring-1 focus:outline-none"
            />
            <PencilIcon className="text-text-disabled pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2" />
          </div>
        </div>
        {stepsLength > 1 && (
          <button type="button" onClick={() => removeStep(idx)} aria-label="Remove step" className="text-text-muted hover:bg-danger-50 hover:text-danger-600 rounded p-1">
            <TrashIcon className="size-4" />
          </button>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Prompt */}
        <div>
          <label htmlFor={`step-prompt-version-${idx}`} className="text-text-secondary text-caption mb-1 block font-medium">
            Prompt Version
          </label>
          <PromptVersionSelector id={`step-prompt-version-${idx}`} value={step.prompt_version_id} promptVersions={promptVersions} onChange={(id) => updateStep(idx, { prompt_version_id: id })} />
        </div>
      </div>

      {/* Include from run presets: what to pull for this step (presets are chosen when you run) */}
      <div className="border-border bg-surface-muted mt-4 rounded-lg border p-4">
        <p className="text-text-secondary text-caption mb-3 font-medium">Include from run presets</p>
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
                <label key={key} className={`text-body flex items-center gap-2 ${overridden ? "text-text-disabled cursor-not-allowed" : "text-text-secondary cursor-pointer"}`}>
                  <input
                    type="checkbox"
                    checked={overridden ? false : step[key]}
                    disabled={overridden}
                    onChange={(e) => updateStep(idx, { [key]: e.target.checked })}
                    className="text-primary-600 focus:ring-primary-500 border-border-strong rounded disabled:opacity-50"
                  />
                  {label}
                  {overridden && <span className="text-warning-600 text-caption">(from step {step[override]})</span>}
                </label>
              );
            })}
          </div>
          <label className="text-text-secondary text-body flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={step.include_product_images} onChange={(e) => updateStep(idx, { include_product_images: e.target.checked })} className="text-primary-600 focus:ring-primary-500 border-border-strong rounded" />
            Product images
          </label>
        </div>
      </div>

      {/* Product Image Type Overrides */}
      {step.include_product_images && <ProductImageTypeOverrides value={step.product_image_types} onChange={(v) => updateStep(idx, { product_image_types: v })} />}

      {/* Scene Field Overrides (only for step 2+) */}
      {idx > 0 && (
        <div className="border-warning-200 bg-warning-50 mt-4 rounded-lg border p-3">
          <p className="text-warning-800 text-caption mb-2 font-medium">Use output from a previous step as scene input</p>
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
                <label className="text-warning-700 text-caption mb-1 block">{label}</label>
                <select
                  value={step[field] ?? ""}
                  onChange={(e) => {
                    const val = e.target.value ? Number(e.target.value) : null;
                    const updates: Record<string, unknown> = { [field]: val };
                    if (val != null) updates[includeKey] = false;
                    updateStep(idx, updates);
                  }}
                  className="border-warning-300 bg-surface focus:border-warning-500 focus:ring-warning-500 text-caption w-full rounded border px-2 py-1 focus:ring-1 focus:outline-none"
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
        <div className="border-primary-200 bg-primary-50 mt-4 rounded-lg border p-3">
          <p className="text-primary-800 text-caption mb-2 font-medium">Include output from a previous step as extra image</p>
          <div className="max-w-xs">
            <select
              value={step.arbitrary_image_from_step ?? ""}
              onChange={(e) =>
                updateStep(idx, {
                  arbitrary_image_from_step: e.target.value ? Number(e.target.value) : null
                })
              }
              className="border-primary-300 bg-surface focus:border-primary-500 focus:ring-primary-500 text-body w-full rounded border px-2 py-1.5 focus:ring-1 focus:outline-none"
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
