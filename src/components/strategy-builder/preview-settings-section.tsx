'use client';

import type { Dispatch, SetStateAction } from 'react';
import { SearchableSelect } from './searchable-select';
import {
  defaultPreviewSettings,
  PREVIEW_RESOLUTIONS,
  type ModelOption,
  type PreviewSettings,
} from './types';

export function PreviewSettingsSection({
  previewSettings,
  setPreviewSettings,
  previewModels,
  defaultPreviewModel,
}: {
  previewSettings: PreviewSettings;
  setPreviewSettings: Dispatch<SetStateAction<PreviewSettings>>;
  previewModels: ModelOption[];
  defaultPreviewModel: string;
}) {
  return (
    <div className="rounded-card border-border bg-surface shadow-card border p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-h3 text-text-primary font-semibold">Preview Generation</h2>
          <p className="text-caption text-text-muted mt-1">
            Generate a fast, low-resolution preview in parallel with the main run. Sends an early
            callback before the full result.
          </p>
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
                  preview_resolution: '512',
                });
              } else {
                setPreviewSettings(defaultPreviewSettings);
              }
            }}
            className="peer sr-only"
          />
          <div className="peer peer-checked:bg-primary-600 peer-focus:ring-primary-300 h-5 w-9 rounded-full bg-gray-200 peer-focus:ring-2 peer-focus:outline-none after:absolute after:top-[2px] after:left-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white" />
        </label>
      </div>

      {previewSettings.preview_model !== null && (
        <div className="mt-4 grid grid-cols-1 gap-4 border-t border-gray-100 pt-4 lg:grid-cols-2">
          <div>
            <label htmlFor="preview-model" className="mb-1 block text-xs font-medium text-gray-600">
              Preview Model
            </label>
            <SearchableSelect
              id="preview-model"
              value={previewSettings.preview_model}
              options={previewModels}
              onChange={(v) => setPreviewSettings((s) => ({ ...s, preview_model: v }))}
            />
          </div>
          <div>
            <label
              htmlFor="preview-resolution"
              className="mb-1 block text-xs font-medium text-gray-600"
            >
              Preview Resolution
            </label>
            <select
              id="preview-resolution"
              value={previewSettings.preview_resolution}
              onChange={(e) =>
                setPreviewSettings((s) => ({ ...s, preview_resolution: e.target.value }))
              }
              className="focus:border-primary-500 focus:ring-primary-500 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:ring-1 focus:outline-none"
            >
              {PREVIEW_RESOLUTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
