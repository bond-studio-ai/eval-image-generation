"use client";

import type { Dispatch, SetStateAction } from "react";
import { Card } from "@/components/ui/card";
import { SearchableSelect } from "./searchable-select";
import { defaultPreviewSettings, type ModelOption, PREVIEW_RESOLUTIONS, type PreviewSettings } from "./types";

export function PreviewSettingsSection({
  previewSettings,
  setPreviewSettings,
  previewModels,
  defaultPreviewModel
}: {
  previewSettings: PreviewSettings;
  setPreviewSettings: Dispatch<SetStateAction<PreviewSettings>>;
  previewModels: ModelOption[];
  defaultPreviewModel: string;
}) {
  return (
    <Card padding="md">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-h3 text-text-primary font-semibold">Preview Generation</h2>
          <p className="text-caption text-text-muted mt-1">Generate a fast, low-resolution preview in parallel with the main run. Sends an early callback before the full result.</p>
        </div>
        <label className="relative inline-flex cursor-pointer items-center">
          <span className="sr-only">Enable preview generation</span>
          <input
            type="checkbox"
            checked={previewSettings.preview_model !== null}
            onChange={(e) => {
              if (e.target.checked) {
                setPreviewSettings({
                  preview_model: defaultPreviewModel,
                  preview_resolution: "512"
                });
              } else {
                setPreviewSettings(defaultPreviewSettings);
              }
            }}
            className="peer sr-only"
          />
          <div className="peer peer-checked:bg-primary-600 peer-focus:ring-primary-300 after:border-border-strong after:bg-surface bg-border peer-checked:after:border-text-inverse h-5 w-9 rounded-full peer-focus:ring-2 peer-focus:outline-none after:absolute after:top-[2px] after:left-[2px] after:h-4 after:w-4 after:rounded-full after:border after:transition-all after:content-[''] peer-checked:after:translate-x-full" />
        </label>
      </div>

      {previewSettings.preview_model !== null && (
        <div className="border-border-subtle mt-4 grid grid-cols-1 gap-4 border-t pt-4 lg:grid-cols-2">
          <div>
            <label htmlFor="preview-model" className="text-text-secondary text-caption mb-1 block font-medium">
              Preview Model
            </label>
            <SearchableSelect
              id="preview-model"
              value={previewSettings.preview_model}
              options={previewModels}
              onChange={(value) => {
                setPreviewSettings((prev) => ({ ...prev, preview_model: value }));
              }}
            />
          </div>
          <div>
            <label htmlFor="preview-resolution" className="text-text-secondary text-caption mb-1 block font-medium">
              Preview Resolution
            </label>
            <select
              id="preview-resolution"
              value={previewSettings.preview_resolution}
              onChange={(e) => {
                setPreviewSettings((prev) => ({ ...prev, preview_resolution: e.target.value }));
              }}
              className="focus:border-primary-500 focus:ring-primary-500 border-border-strong text-body w-full rounded-lg border px-2 py-1.5 focus:ring-1 focus:outline-none"
            >
              {PREVIEW_RESOLUTIONS.map((resolution) => (
                <option key={resolution} value={resolution}>
                  {resolution}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </Card>
  );
}
