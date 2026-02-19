'use client';

import type { InputPresetListItem, PromptVersionListItem } from '@/lib/queries';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

interface StepData {
  prompt_version_id: string;
  input_preset_id: string | null;
  model: string;
  aspect_ratio: string;
  output_resolution: string;
  temperature: number;
  use_google_search: boolean;
  tag_images: boolean;
  dollhouse_view_from_step: number | null;
  real_photo_from_step: number | null;
  mood_board_from_step: number | null;
}

interface StrategyBuilderProps {
  strategyId?: string;
  initialName?: string;
  initialDescription?: string;
  initialSteps?: StepData[];
  promptVersions: PromptVersionListItem[];
  inputPresets: InputPresetListItem[];
}

function defaultStep(promptVersionId: string): StepData {
  return {
    prompt_version_id: promptVersionId,
    input_preset_id: null,
    model: 'gemini-2.5-flash-image',
    aspect_ratio: '1:1',
    output_resolution: '1K',
    temperature: 1.0,
    use_google_search: false,
    tag_images: true,
    dollhouse_view_from_step: null,
    real_photo_from_step: null,
    mood_board_from_step: null,
  };
}

const MODELS = [
  { value: 'gemini-2.5-flash-image', label: 'Nano Banana' },
  { value: 'gemini-3-pro-image-preview', label: 'Nano Banana Pro' },
];

const ASPECT_RATIOS = ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'];
const RESOLUTIONS = ['1K', '2K', '4K'];

export function StrategyBuilder({
  strategyId,
  initialName = '',
  initialDescription = '',
  initialSteps,
  promptVersions,
  inputPresets,
}: StrategyBuilderProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [steps, setSteps] = useState<StepData[]>(
    initialSteps?.length
      ? initialSteps
      : [defaultStep(promptVersions[0]?.id ?? '')],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!strategyId;

  const updateStep = useCallback((idx: number, partial: Partial<StepData>) => {
    setSteps((prev) => prev.map((s, i) => (i === idx ? { ...s, ...partial } : s)));
  }, []);

  const addStep = useCallback(() => {
    setSteps((prev) => [...prev, defaultStep(promptVersions[0]?.id ?? '')]);
  }, [promptVersions]);

  const removeStep = useCallback((idx: number) => {
    setSteps((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      // Clear any override references to removed/shifted steps
      return next.map((s) => ({
        ...s,
        dollhouse_view_from_step: s.dollhouse_view_from_step && s.dollhouse_view_from_step > next.length ? null : s.dollhouse_view_from_step,
        real_photo_from_step: s.real_photo_from_step && s.real_photo_from_step > next.length ? null : s.real_photo_from_step,
        mood_board_from_step: s.mood_board_from_step && s.mood_board_from_step > next.length ? null : s.mood_board_from_step,
      }));
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (!name.trim()) return;
    if (steps.length === 0) return;

    setSaving(true);
    setError(null);

    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        steps: steps.map((s, i) => ({
          ...s,
          step_order: i + 1,
          temperature: s.temperature,
        })),
      };

      const url = isEditing
        ? `/api/v1/strategies/${strategyId}`
        : '/api/v1/strategies';
      const method = isEditing ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error?.message || 'Failed to save strategy');
        return;
      }

      const sid = isEditing ? strategyId : data.data.id;
      router.push(`/strategies/${sid}`);
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  }, [name, description, steps, isEditing, strategyId, router]);

  return (
    <div className="space-y-6">
      {/* Name & Description */}
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-xs">
        <div className="space-y-4">
          <div>
            <label htmlFor="strategy-name" className="mb-1 block text-sm font-medium text-gray-700">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              id="strategy-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Modern bathroom 3-step refinement"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500 focus:outline-none focus:ring-1"
            />
          </div>
          <div>
            <label htmlFor="strategy-desc" className="mb-1 block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              id="strategy-desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500 focus:outline-none focus:ring-1"
            />
          </div>
        </div>
      </div>

      {/* Steps */}
      <div>
        <h2 className="text-sm font-semibold text-gray-900 uppercase">Steps</h2>
        <div className="mt-3 space-y-4">
          {steps.map((step, idx) => (
            <div key={idx} className="rounded-lg border border-gray-200 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center justify-center rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-semibold text-primary-700">
                  Step {idx + 1}
                </span>
                {steps.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeStep(idx)}
                    className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                )}
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                {/* Prompt */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Prompt Version</label>
                  <select
                    value={step.prompt_version_id}
                    onChange={(e) => updateStep(idx, { prompt_version_id: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500 focus:outline-none focus:ring-1"
                  >
                    <option value="">-- Select --</option>
                    {promptVersions.map((pv) => (
                      <option key={pv.id} value={pv.id}>{pv.name || 'Untitled'}</option>
                    ))}
                  </select>
                </div>

                {/* Input Preset */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Input Preset</label>
                  <select
                    value={step.input_preset_id ?? ''}
                    onChange={(e) => updateStep(idx, { input_preset_id: e.target.value || null })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500 focus:outline-none focus:ring-1"
                  >
                    <option value="">-- None --</option>
                    {inputPresets.map((ip) => (
                      <option key={ip.id} value={ip.id}>{ip.name || 'Untitled'}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Model Settings */}
              <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Model</label>
                  <select
                    value={step.model}
                    onChange={(e) => updateStep(idx, { model: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-primary-500 focus:ring-primary-500 focus:outline-none focus:ring-1"
                  >
                    {MODELS.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Aspect Ratio</label>
                  <select
                    value={step.aspect_ratio}
                    onChange={(e) => updateStep(idx, { aspect_ratio: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-primary-500 focus:ring-primary-500 focus:outline-none focus:ring-1"
                  >
                    {ASPECT_RATIOS.map((ar) => (
                      <option key={ar} value={ar}>{ar}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Resolution</label>
                  <select
                    value={step.output_resolution}
                    onChange={(e) => updateStep(idx, { output_resolution: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-primary-500 focus:ring-primary-500 focus:outline-none focus:ring-1"
                  >
                    {RESOLUTIONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Temperature</label>
                  <input
                    type="number"
                    min={0}
                    max={2}
                    step={0.1}
                    value={step.temperature}
                    onChange={(e) => updateStep(idx, { temperature: Number(e.target.value) || 1.0 })}
                    placeholder="1.0"
                    className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-primary-500 focus:ring-primary-500 focus:outline-none focus:ring-1"
                  />
                </div>
              </div>

              {/* Checkboxes */}
              <div className="mt-3 flex gap-6">
                <label className="flex items-center gap-2 text-xs text-gray-600">
                  <input
                    type="checkbox"
                    checked={step.tag_images}
                    onChange={(e) => updateStep(idx, { tag_images: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  Tag images
                </label>
                <label className="flex items-center gap-2 text-xs text-gray-600">
                  <input
                    type="checkbox"
                    checked={step.use_google_search}
                    onChange={(e) => updateStep(idx, { use_google_search: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  Google Search
                </label>
              </div>

              {/* Scene Field Overrides (only for step 2+) */}
              {idx > 0 && (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="mb-2 text-xs font-medium text-amber-800">Use output from a previous step as scene input</p>
                  <div className="grid grid-cols-3 gap-3">
                    {(['dollhouse_view_from_step', 'real_photo_from_step', 'mood_board_from_step'] as const).map((field) => {
                      const labels: Record<string, string> = {
                        dollhouse_view_from_step: 'Dollhouse View',
                        real_photo_from_step: 'Real Photo',
                        mood_board_from_step: 'Mood Board',
                      };
                      return (
                        <div key={field}>
                          <label className="mb-1 block text-xs text-amber-700">{labels[field]}</label>
                          <select
                            value={step[field] ?? ''}
                            onChange={(e) => updateStep(idx, { [field]: e.target.value ? Number(e.target.value) : null })}
                            className="w-full rounded border border-amber-300 bg-white px-2 py-1 text-xs focus:border-amber-500 focus:ring-amber-500 focus:outline-none focus:ring-1"
                          >
                            <option value="">-- None --</option>
                            {Array.from({ length: idx }, (_, i) => (
                              <option key={i + 1} value={i + 1}>
                                Step {i + 1} output
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addStep}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 px-4 py-3 text-sm font-medium text-gray-600 transition-colors hover:border-gray-400 hover:text-gray-800"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Step
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Save */}
      <div className="sticky bottom-0 flex justify-end border-t border-gray-200 bg-white py-4">
        <button
          onClick={handleSave}
          disabled={!name.trim() || steps.length === 0 || saving}
          className="bg-primary-600 hover:bg-primary-700 disabled:bg-primary-300 inline-flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-medium text-white transition-colors"
        >
          {saving ? (
            <>
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Saving...
            </>
          ) : (
            isEditing ? 'Update Strategy' : 'Create Strategy'
          )}
        </button>
      </div>
    </div>
  );
}
