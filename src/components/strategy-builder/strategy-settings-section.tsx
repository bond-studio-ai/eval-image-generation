"use client";

import type { Dispatch, SetStateAction } from "react";
import { FormSection } from "@/components/ui/form-section";
import { ModelSelect } from "./model-select";
import { ASPECT_RATIOS, type ModelOption, RESOLUTIONS, type StrategySettings } from "./types";

export function StrategySettingsSection({ strategySettings, setStrategySettings, generationModels }: { strategySettings: StrategySettings; setStrategySettings: Dispatch<SetStateAction<StrategySettings>>; generationModels: ModelOption[] }) {
  return (
    <FormSection title="Strategy settings" description="Used by all steps. Model, aspect ratio, resolution, temperature, tag images, and Google Search.">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div>
          <label htmlFor="strategy-model" className="text-text-secondary text-caption mb-1 block font-medium">
            Model
          </label>
          <ModelSelect
            id="strategy-model"
            value={strategySettings.model}
            options={generationModels}
            onChange={(value) => {
              setStrategySettings((prev) => ({ ...prev, model: value }));
            }}
          />
        </div>
        <div>
          <label htmlFor="strategy-aspect-ratio" className="text-text-secondary text-caption mb-1 block font-medium">
            Aspect Ratio
          </label>
          <select
            id="strategy-aspect-ratio"
            value={strategySettings.aspect_ratio}
            onChange={(e) => {
              setStrategySettings((prev) => ({ ...prev, aspect_ratio: e.target.value }));
            }}
            className="focus:border-primary-500 focus:ring-primary-500 border-border-strong text-body w-full rounded-lg border px-2 py-1.5 focus:ring-1 focus:outline-none"
          >
            {ASPECT_RATIOS.map((ar) => (
              <option key={ar} value={ar}>
                {ar}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="strategy-resolution" className="text-text-secondary text-caption mb-1 block font-medium">
            Resolution
          </label>
          <select
            id="strategy-resolution"
            value={strategySettings.output_resolution}
            onChange={(e) => {
              setStrategySettings((prev) => ({ ...prev, output_resolution: e.target.value }));
            }}
            className="focus:border-primary-500 focus:ring-primary-500 border-border-strong text-body w-full rounded-lg border px-2 py-1.5 focus:ring-1 focus:outline-none"
          >
            {RESOLUTIONS.map((resolution) => (
              <option key={resolution} value={resolution}>
                {resolution}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="strategy-temperature" className="text-text-secondary text-caption mb-1 block font-medium">
            Temperature
          </label>
          <input
            id="strategy-temperature"
            type="number"
            min={0}
            max={2}
            step={0.1}
            value={strategySettings.temperature}
            onChange={(e) => {
              setStrategySettings((prev) => ({ ...prev, temperature: Number(e.target.value) || 1 }));
            }}
            className="focus:border-primary-500 focus:ring-primary-500 border-border-strong text-body w-full rounded-lg border px-2 py-1.5 focus:ring-1 focus:outline-none"
          />
        </div>
      </div>
      <div className="mt-3 flex gap-6">
        <label className="text-text-secondary text-caption flex items-center gap-2">
          <input
            type="checkbox"
            checked={strategySettings.tag_images}
            onChange={(e) => {
              setStrategySettings((prev) => ({ ...prev, tag_images: e.target.checked }));
            }}
            className="border-border-strong rounded"
          />
          Tag images
        </label>
        <label className="text-text-secondary text-caption flex items-center gap-2">
          <input
            type="checkbox"
            checked={strategySettings.use_google_search}
            onChange={(e) => {
              setStrategySettings((prev) => ({ ...prev, use_google_search: e.target.checked }));
            }}
            className="border-border-strong rounded"
          />
          Google Search
        </label>
        <label className="text-text-secondary text-caption flex items-center gap-2">
          <input
            type="checkbox"
            checked={strategySettings.group_product_images}
            onChange={(e) => {
              setStrategySettings((prev) => ({ ...prev, group_product_images: e.target.checked }));
            }}
            className="border-border-strong rounded"
          />
          Group product images
        </label>
        <label className="text-text-secondary text-caption flex items-center gap-2">
          <input
            type="checkbox"
            checked={strategySettings.check_scene_accuracy}
            onChange={(e) => {
              setStrategySettings((prev) => ({ ...prev, check_scene_accuracy: e.target.checked }));
            }}
            className="border-border-strong rounded"
          />
          Check scene accuracy
        </label>
        <label
          className="text-text-secondary text-caption flex items-center gap-2"
          title="When enabled, every generation step inherits the prior step's chat history (Gemini multi-turn natively; OpenAI image / Fal flatten the chain into prompt + input images)."
        >
          <input
            type="checkbox"
            checked={strategySettings.enable_multi_turn_context}
            onChange={(e) => {
              setStrategySettings((prev) => ({ ...prev, enable_multi_turn_context: e.target.checked }));
            }}
            className="border-border-strong rounded"
          />
          Multi-turn context
        </label>
      </div>
    </FormSection>
  );
}
