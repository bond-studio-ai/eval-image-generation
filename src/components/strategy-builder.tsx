'use client';

import { ResourceFormHeader } from '@/components/resource-form-header';
import { serviceUrl } from '@/lib/api-base';
import type { ModelListing } from '@/lib/service-client';
import type { InputPresetListItem, PromptVersionListItem } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface StepData {
  id?: string;
  type: 'generation' | 'judge';
  number_of_images?: number;
  name: string;
  prompt_version_id: string;
  model: string;
  aspect_ratio: string;
  output_resolution: string;
  temperature: number;
  use_google_search: boolean;
  tag_images: boolean;
  dollhouse_view_from_step: number | null;
  real_photo_from_step: number | null;
  mood_board_from_step: number | null;
  include_dollhouse: boolean;
  include_real_photo: boolean;
  include_mood_board: boolean;
  include_product_images: boolean;
  include_product_categories: string[];
  arbitrary_image_from_step: number | null;
  judges?: JudgeData[];
}


interface StrategySettings {
  model: string;
  aspect_ratio: string;
  output_resolution: string;
  temperature: number;
  use_google_search: boolean;
  tag_images: boolean;
  group_product_images: boolean;
  /** Maps to API checkSceneAccuracy / DB check_scene_accuracy */
  check_scene_accuracy: boolean;
}

interface JudgeData {
  id?: string;
  name?: string;
  judge_model: string;
  judge_type: 'batch' | 'individual';
  judge_prompt_version_id: string;
  tolerance_threshold: number;
}

interface PreviewSettings {
  preview_model: string | null;
  preview_resolution: string;
}

interface StrategyBuilderProps {
  strategyId?: string;
  initialName?: string;
  initialDescription?: string;
  initialStrategySettings?: StrategySettings;
  initialPreviewSettings?: PreviewSettings;
  initialSteps?: StepData[];
  initialJudges?: JudgeData[];
  promptVersions: PromptVersionListItem[];
  inputPresets: InputPresetListItem[];
  models?: ModelListing;
}

function defaultStep(promptVersionId: string): StepData {
  return {
    type: 'generation',
    name: '',
    prompt_version_id: promptVersionId,
    model: 'gemini-3-pro-image-preview',
    aspect_ratio: '1:1',
    output_resolution: '1K',
    temperature: 1.0,
    use_google_search: false,
    tag_images: true,
    dollhouse_view_from_step: null,
    real_photo_from_step: null,
    mood_board_from_step: null,
    include_dollhouse: true,
    include_real_photo: true,
    include_mood_board: true,
    include_product_images: true,
    include_product_categories: [],
    arbitrary_image_from_step: null,
  };
}

const ASPECT_RATIOS = ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'];
const RESOLUTIONS = ['1K', '2K', '4K'];

const JUDGE_TYPES: { value: 'batch' | 'individual'; label: string; description: string }[] = [
  { value: 'batch', label: 'Batch', description: 'Send all results in one request, pick the best' },
  { value: 'individual', label: 'Individual', description: 'Score each result 1-100 in parallel' },
];

const defaultPreviewSettings: PreviewSettings = {
  preview_model: null,
  preview_resolution: '512',
};

const PREVIEW_RESOLUTIONS = ['512', '1K', '2K', '4K'];

const defaultStrategySettings: StrategySettings = {
  model: 'gemini-3-pro-image-preview',
  aspect_ratio: '1:1',
  output_resolution: '1K',
  temperature: 1.0,
  use_google_search: false,
  tag_images: true,
  group_product_images: false,
  check_scene_accuracy: false,
};

const CANDIDATE_PRESETS = [1, 2, 4, 8] as const;

function CandidatePicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const isPreset = CANDIDATE_PRESETS.includes(value as 1 | 2 | 4 | 8);
  const [custom, setCustom] = useState(!isPreset);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (custom) inputRef.current?.focus();
  }, [custom]);

  const activeCls = 'bg-amber-600 text-white shadow-sm';
  const inactiveCls = 'bg-white text-amber-800 ring-1 ring-amber-300 hover:bg-amber-50';
  const btnBase = 'min-w-[1.75rem] rounded-md px-1.5 py-1 text-xs font-semibold transition-colors';

  return (
    <div className="flex items-center gap-2">
      <label className="text-xs font-medium text-amber-800">Candidates:</label>
      <div className="flex items-center gap-1">
        {CANDIDATE_PRESETS.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => { setCustom(false); onChange(n); }}
            className={`${btnBase} ${!custom && value === n ? activeCls : inactiveCls}`}
          >
            {n}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setCustom(true)}
          className={`${btnBase} ${custom ? activeCls : inactiveCls}`}
        >
          Custom
        </button>
        {custom && (
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            value={value}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (!Number.isNaN(v) && v >= 1 && v <= 100) onChange(v);
              else if (e.target.value === '') onChange(1);
            }}
            className="w-12 rounded-md border border-amber-300 bg-white px-1.5 py-1 text-center text-xs font-semibold text-amber-900 [appearance:textfield] focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
        )}
      </div>
    </div>
  );
}

export function StrategyBuilder({
  strategyId,
  initialName = '',
  initialDescription = '',
  initialStrategySettings,
  initialPreviewSettings,
  initialSteps,
  initialJudges,
  promptVersions,
  inputPresets,
  models,
}: StrategyBuilderProps) {
  const generationModels = useMemo(
    () => (models?.generation ?? []).map((m) => ({ value: m.id, label: m.name })),
    [models],
  );

  const judgeModels = useMemo(
    () => (models?.judge ?? []).map((m) => ({ value: m.id, label: m.name })),
    [models],
  );
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [strategySettings, setStrategySettings] = useState<StrategySettings>(
    initialStrategySettings ?? defaultStrategySettings,
  );
  const [previewSettings, setPreviewSettings] = useState<PreviewSettings>(
    initialPreviewSettings ?? defaultPreviewSettings,
  );
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

  const addJudgeStep = useCallback(() => {
    setSteps((prev) => [
      ...prev,
      {
        type: 'judge' as const,
        name: 'Judge',
        number_of_images: 4,
        prompt_version_id: '',
        model: 'gemini-3-pro-image-preview',
        aspect_ratio: '1:1',
        output_resolution: '1K',
        temperature: 1.0,
        use_google_search: false,
        tag_images: true,
        dollhouse_view_from_step: null,
        real_photo_from_step: null,
        mood_board_from_step: null,
        include_dollhouse: true,
        include_real_photo: true,
        include_mood_board: true,
        include_product_images: true,
        include_product_categories: [],
        arbitrary_image_from_step: null,
        judges: [{
          name: '',
          judge_model: 'gemini-2.5-flash',
          judge_type: 'individual',
          judge_prompt_version_id: '',
          tolerance_threshold: 1,
        }],
      },
    ]);
  }, []);

  const removeStep = useCallback((idx: number) => {
    setSteps((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      return next.map((s) => ({
        ...s,
        dollhouse_view_from_step: s.dollhouse_view_from_step && s.dollhouse_view_from_step > next.length ? null : s.dollhouse_view_from_step,
        real_photo_from_step: s.real_photo_from_step && s.real_photo_from_step > next.length ? null : s.real_photo_from_step,
        mood_board_from_step: s.mood_board_from_step && s.mood_board_from_step > next.length ? null : s.mood_board_from_step,
        arbitrary_image_from_step: s.arbitrary_image_from_step != null && s.arbitrary_image_from_step > next.length ? null : s.arbitrary_image_from_step,
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
        model: strategySettings.model,
        aspectRatio: strategySettings.aspect_ratio,
        outputResolution: strategySettings.output_resolution,
        temperature: strategySettings.temperature,
        useGoogleSearch: strategySettings.use_google_search,
        tagImages: strategySettings.tag_images,
        groupProductImages: strategySettings.group_product_images,
        checkSceneAccuracy: strategySettings.check_scene_accuracy,
        previewModel: previewSettings.preview_model,
        previewResolution: previewSettings.preview_model ? previewSettings.preview_resolution : null,
        steps: steps.map((s, i) => ({
          id: s.id ?? undefined,
          type: s.type ?? 'generation',
          numberOfImages: s.type === 'judge' ? (s.number_of_images ?? 4) : undefined,
          name: s.name.trim() || null,
          stepOrder: i + 1,
          promptVersionId: s.type === 'judge' ? null : s.prompt_version_id,
          model: strategySettings.model,
          aspectRatio: strategySettings.aspect_ratio,
          outputResolution: strategySettings.output_resolution,
          temperature: strategySettings.temperature,
          useGoogleSearch: strategySettings.use_google_search,
          tagImages: strategySettings.tag_images,
          groupProductImages: strategySettings.group_product_images,
          dollhouseViewFromStep: s.dollhouse_view_from_step ?? null,
          realPhotoFromStep: s.real_photo_from_step ?? null,
          moodBoardFromStep: s.mood_board_from_step ?? null,
          includeDollhouse: s.include_dollhouse,
          includeRealPhoto: s.include_real_photo,
          includeMoodBoard: s.include_mood_board,
          includeProductImages: s.include_product_images,
          includeProductCategories: s.include_product_categories ?? [],
          arbitraryImageFromStep: s.arbitrary_image_from_step ?? null,
          judges: s.type === 'judge' && s.judges?.length
            ? s.judges.map((j, ji) => ({
                id: j.id,
                name: j.name || null,
                judgeModel: j.judge_model,
                judgeType: j.judge_type,
                judgePromptVersionId: j.judge_prompt_version_id,
                toleranceThreshold: j.tolerance_threshold,
                position: ji + 1,
              }))
            : undefined,
        })),
      };

      const url = isEditing
        ? serviceUrl(`strategies/${strategyId}`)
        : serviceUrl('strategies');
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
  }, [name, description, strategySettings, previewSettings, steps, isEditing, strategyId, router]);

  const saveButton = (
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
  );

  return (
    <div className="space-y-6">
      {/* Header with save */}
      <div className="flex justify-end">
        {saveButton}
      </div>

      <ResourceFormHeader
        name={name}
        onNameChange={setName}
        namePlaceholder="e.g. Modern bathroom 3-step refinement"
        description={description}
        onDescriptionChange={setDescription}
      />

      {/* Strategy-level settings (Model, Aspect Ratio, etc.) */}
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-xs">
        <h2 className="text-sm font-semibold text-gray-900 uppercase">Strategy settings</h2>
        <p className="mt-1 text-xs text-gray-500">Used by all steps. Model, aspect ratio, resolution, temperature, tag images, and Google Search.</p>
        <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Model</label>
            <SearchableSelect
              value={strategySettings.model}
              options={generationModels}
              onChange={(v) => setStrategySettings((s) => ({ ...s, model: v }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Aspect Ratio</label>
            <select
              value={strategySettings.aspect_ratio}
              onChange={(e) => setStrategySettings((s) => ({ ...s, aspect_ratio: e.target.value }))}
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
              value={strategySettings.output_resolution}
              onChange={(e) => setStrategySettings((s) => ({ ...s, output_resolution: e.target.value }))}
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
              value={strategySettings.temperature}
              onChange={(e) => setStrategySettings((s) => ({ ...s, temperature: Number(e.target.value) || 1.0 }))}
              className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-primary-500 focus:ring-primary-500 focus:outline-none focus:ring-1"
            />
          </div>
        </div>
        <div className="mt-3 flex gap-6">
          <label className="flex items-center gap-2 text-xs text-gray-600">
            <input
              type="checkbox"
              checked={strategySettings.tag_images}
              onChange={(e) => setStrategySettings((s) => ({ ...s, tag_images: e.target.checked }))}
              className="rounded border-gray-300"
            />
            Tag images
          </label>
          <label className="flex items-center gap-2 text-xs text-gray-600">
            <input
              type="checkbox"
              checked={strategySettings.use_google_search}
              onChange={(e) => setStrategySettings((s) => ({ ...s, use_google_search: e.target.checked }))}
              className="rounded border-gray-300"
            />
            Google Search
          </label>
          <label className="flex items-center gap-2 text-xs text-gray-600">
            <input
              type="checkbox"
              checked={strategySettings.group_product_images}
              onChange={(e) => setStrategySettings((s) => ({ ...s, group_product_images: e.target.checked }))}
              className="rounded border-gray-300"
            />
            Group product images
          </label>
          <label className="flex items-center gap-2 text-xs text-gray-600">
            <input
              type="checkbox"
              checked={strategySettings.check_scene_accuracy}
              onChange={(e) => setStrategySettings((s) => ({ ...s, check_scene_accuracy: e.target.checked }))}
              className="rounded border-gray-300"
            />
            Check scene accuracy
          </label>
        </div>
      </div>

      {/* Preview Generation */}
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 uppercase">Preview Generation</h2>
            <p className="mt-1 text-xs text-gray-500">
              Generate a fast, low-resolution preview in parallel with the main run. Sends an early callback before the full result.
            </p>
          </div>
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={previewSettings.preview_model !== null}
              onChange={(e) => {
                if (e.target.checked) {
                  setPreviewSettings({ preview_model: 'gemini-3.1-flash-image-preview', preview_resolution: '512' });
                } else {
                  setPreviewSettings(defaultPreviewSettings);
                }
              }}
              className="peer sr-only"
            />
            <div className="peer h-5 w-9 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-300" />
          </label>
        </div>

        {previewSettings.preview_model !== null && (
          <div className="mt-4 grid grid-cols-1 gap-4 border-t border-gray-100 pt-4 lg:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Preview Model</label>
              <SearchableSelect
                value={previewSettings.preview_model}
                options={generationModels}
                onChange={(v) => setPreviewSettings((s) => ({ ...s, preview_model: v }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Preview Resolution</label>
              <select
                value={previewSettings.preview_resolution}
                onChange={(e) => setPreviewSettings((s) => ({ ...s, preview_resolution: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-primary-500 focus:ring-primary-500 focus:outline-none focus:ring-1"
              >
                {PREVIEW_RESOLUTIONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Steps */}
      <div>
        <h2 className="text-sm font-semibold text-gray-900 uppercase">Steps</h2>
        <div className="mt-3 space-y-4">
          {steps.map((step, idx) => step.type === 'judge' ? (
            <div key={idx} className="rounded-lg border border-amber-200 bg-amber-50/50 p-5 shadow-xs">
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
                <button type="button" onClick={() => removeStep(idx)} className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </button>
              </div>
              <p className="mt-2 text-xs text-amber-700">
                Runs the preceding step {step.number_of_images ?? 4} times, evaluates results, and picks the best one.
              </p>

              <div className="mt-4 space-y-3">
                {(step.judges ?? []).map((judge, jIdx) => (
                  <div key={jIdx} className="rounded-lg border border-amber-200 bg-white p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">{jIdx + 1}</span>
                      <div className="flex items-center gap-2">
                        {JUDGE_TYPES.map((jt) => (
                          <label key={jt.value} title={jt.description} className={`cursor-pointer rounded-md border px-2.5 py-1 text-xs transition-colors ${judge.judge_type === jt.value ? 'border-amber-300 bg-amber-50 font-medium text-amber-800' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'}`}>
                            <input type="radio" name={`judge_type_${idx}_${jIdx}`} value={jt.value} checked={judge.judge_type === jt.value} onChange={() => {
                              const newJudges = [...(step.judges ?? [])];
                              newJudges[jIdx] = { ...newJudges[jIdx], judge_type: jt.value };
                              updateStep(idx, { judges: newJudges });
                            }} className="sr-only" />
                            {jt.label}
                          </label>
                        ))}
                      </div>
                      {(step.judges ?? []).length > 1 && (
                        <button type="button" onClick={() => {
                          const newJudges = (step.judges ?? []).filter((_, i) => i !== jIdx);
                          updateStep(idx, { judges: newJudges });
                        }} className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                    <div className="mb-3">
                      <label className="mb-1 block text-xs font-medium text-gray-600">Name (optional)</label>
                      <input type="text" value={judge.name ?? ''} onChange={(e) => {
                        const newJudges = [...(step.judges ?? [])];
                        newJudges[jIdx] = { ...newJudges[jIdx], name: e.target.value };
                        updateStep(idx, { judges: newJudges });
                      }} placeholder="e.g. Scene Accuracy" className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-primary-500 focus:ring-primary-500 focus:outline-none focus:ring-1" />
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-600">Model</label>
                        <SearchableSelect value={judge.judge_model} options={judgeModels} onChange={(v) => {
                          const newJudges = [...(step.judges ?? [])];
                          newJudges[jIdx] = { ...newJudges[jIdx], judge_model: v };
                          updateStep(idx, { judges: newJudges });
                        }} />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-600">Prompt</label>
                        <PromptVersionSelector value={judge.judge_prompt_version_id} promptVersions={promptVersions} onChange={(id) => {
                          const newJudges = [...(step.judges ?? [])];
                          newJudges[jIdx] = { ...newJudges[jIdx], judge_prompt_version_id: id };
                          updateStep(idx, { judges: newJudges });
                        }} />
                      </div>
                    </div>
                    <div className="mt-3">
                      <label className="mb-1 flex items-center justify-between text-xs font-medium text-gray-600">
                        <span>Tolerance</span>
                        <span className="tabular-nums text-gray-900">{judge.tolerance_threshold}<span className="ml-0.5 text-gray-400">/100</span></span>
                      </label>
                      <input type="range" min={1} max={100} value={judge.tolerance_threshold} onChange={(e) => {
                        const newJudges = [...(step.judges ?? [])];
                        newJudges[jIdx] = { ...newJudges[jIdx], tolerance_threshold: Number(e.target.value) };
                        updateStep(idx, { judges: newJudges });
                      }} className="w-full accent-amber-500" />
                    </div>
                  </div>
                ))}
                <button type="button" onClick={() => {
                  const newJudges = [...(step.judges ?? []), { name: '', judge_model: 'gemini-2.5-flash', judge_type: 'individual' as const, judge_prompt_version_id: '', tolerance_threshold: 1 }];
                  updateStep(idx, { judges: newJudges });
                }} className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-50">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Add Judge
                </button>
              </div>
            </div>
          ) : (
            <div key={idx} className="rounded-lg border border-gray-200 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="inline-flex shrink-0 items-center justify-center rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-semibold text-primary-700">
                    Step {idx + 1}
                  </span>
                  <div className="relative">
                    <input
                      type="text"
                      value={step.name}
                      onChange={(e) => updateStep(idx, { name: e.target.value })}
                      placeholder="Name this step..."
                      className="w-56 rounded-lg border border-gray-300 bg-gray-50 pl-3 pr-8 py-1.5 text-sm font-medium text-gray-800 placeholder:text-gray-400 hover:border-gray-400 hover:bg-white focus:border-primary-500 focus:bg-white focus:ring-primary-500 focus:outline-none focus:ring-1 transition-colors"
                    />
                    <svg className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                    </svg>
                  </div>
                </div>
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
                  <PromptVersionSelector
                    value={step.prompt_version_id}
                    promptVersions={promptVersions}
                    onChange={(id) => updateStep(idx, { prompt_version_id: id })}
                  />
                </div>

              </div>

              {/* Include from run presets: what to pull for this step (presets are chosen when you run) */}
              <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                <p className="mb-3 text-xs font-medium text-gray-700">Include from run presets</p>
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-4">
                      {([
                        { key: 'include_dollhouse', override: 'dollhouse_view_from_step', label: 'Dollhouse' },
                        { key: 'include_real_photo', override: 'real_photo_from_step', label: 'Real Life' },
                        { key: 'include_mood_board', override: 'mood_board_from_step', label: 'Mood Board' },
                      ] as const).map(({ key, override, label }) => {
                        const overridden = step[override] != null;
                        return (
                          <label key={key} className={`flex items-center gap-2 text-sm ${overridden ? 'cursor-not-allowed text-gray-400' : 'cursor-pointer text-gray-700'}`}>
                            <input
                              type="checkbox"
                              checked={overridden ? false : step[key]}
                              disabled={overridden}
                              onChange={(e) => updateStep(idx, { [key]: e.target.checked })}
                              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 disabled:opacity-50"
                            />
                            {label}
                            {overridden && <span className="text-xs text-amber-600">(from step {step[override]})</span>}
                          </label>
                        );
                      })}
                    </div>
                    <label className="flex items-center gap-2 text-sm cursor-pointer text-gray-700">
                      <input
                        type="checkbox"
                        checked={step.include_product_images}
                        onChange={(e) => updateStep(idx, { include_product_images: e.target.checked })}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      Product images
                    </label>
                  </div>
                </div>

              {/* Scene Field Overrides (only for step 2+) */}
              {idx > 0 && (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="mb-2 text-xs font-medium text-amber-800">Use output from a previous step as scene input</p>
                  <div className="grid grid-cols-3 gap-3">
                    {([
                      { field: 'dollhouse_view_from_step', includeKey: 'include_dollhouse', label: 'Dollhouse View' },
                      { field: 'real_photo_from_step', includeKey: 'include_real_photo', label: 'Real Photo' },
                      { field: 'mood_board_from_step', includeKey: 'include_mood_board', label: 'Mood Board' },
                    ] as const).map(({ field, includeKey, label }) => (
                      <div key={field}>
                        <label className="mb-1 block text-xs text-amber-700">{label}</label>
                        <select
                          value={step[field] ?? ''}
                          onChange={(e) => {
                            const val = e.target.value ? Number(e.target.value) : null;
                            const updates: Record<string, unknown> = { [field]: val };
                            if (val != null) updates[includeKey] = false;
                            updateStep(idx, updates);
                          }}
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
                      value={step.arbitrary_image_from_step ?? ''}
                      onChange={(e) => updateStep(idx, { arbitrary_image_from_step: e.target.value ? Number(e.target.value) : null })}
                      className="w-full rounded border border-blue-300 bg-white px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none focus:ring-1"
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
          ))}
        </div>

        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={addStep}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 px-4 py-3 text-sm font-medium text-gray-600 transition-colors hover:border-gray-400 hover:text-gray-800"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Generation Step
          </button>
          <button
            type="button"
            onClick={addJudgeStep}
            disabled={steps.length === 0 || steps[steps.length - 1]?.type === 'judge'}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border-2 border-dashed border-amber-300 px-4 py-3 text-sm font-medium text-amber-700 transition-colors hover:border-amber-400 hover:text-amber-800 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 01-2.031.352 5.989 5.989 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971z" />
            </svg>
            Add Judge Step
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

    </div>
  );
}

function SearchableSelect({
  value,
  options,
  onChange,
  placeholder = '-- Select --',
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selectedLabel = useMemo(
    () => options.find((o) => o.value === value)?.label ?? null,
    [options, value],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return options;
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q),
    );
  }, [options, search]);

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-2 text-left text-sm transition-colors hover:border-gray-400 focus:border-primary-500 focus:ring-primary-500 focus:outline-none focus:ring-1"
      >
        <span className={selectedLabel ? 'truncate text-gray-900' : 'text-gray-400'}>
          {selectedLabel || placeholder}
        </span>
        <svg className="h-4 w-4 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40 cursor-pointer" onClick={() => { setOpen(false); setSearch(''); }} />
          <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
            <div className="p-2">
              <input
                autoFocus
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search models..."
                className="w-full rounded border border-gray-300 px-2.5 py-1.5 text-sm focus:border-primary-500 focus:ring-primary-500 focus:outline-none focus:ring-1"
              />
            </div>
            <div className="max-h-56 overflow-y-auto border-t border-gray-100">
              {filtered.length === 0 && (
                <div className="px-3 py-3 text-center text-sm text-gray-400">No matches</div>
              )}
              {filtered.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => { onChange(o.value); setOpen(false); setSearch(''); }}
                  className={`flex w-full flex-col px-3 py-2 text-left transition-colors hover:bg-gray-50 ${o.value === value ? 'bg-primary-50 text-primary-700' : 'text-gray-700'}`}
                >
                  <span className={`text-sm ${o.value === value ? 'font-medium' : ''}`}>{o.label}</span>
                  <span className="font-mono text-xs text-gray-400">{o.value}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function PromptVersionSelector({
  value,
  promptVersions,
  onChange,
}: {
  value: string;
  promptVersions: PromptVersionListItem[];
  onChange: (id: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selectedName = useMemo(
    () => promptVersions.find((pv) => pv.id === value)?.name || null,
    [promptVersions, value],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return promptVersions;
    return promptVersions.filter(
      (pv) =>
        (pv.name ?? '').toLowerCase().includes(q) ||
        (pv.systemPrompt ?? '').toLowerCase().includes(q) ||
        (pv.userPrompt ?? '').toLowerCase().includes(q),
    );
  }, [promptVersions, search]);

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-2 text-left text-sm transition-colors hover:border-gray-400 focus:border-primary-500 focus:ring-primary-500 focus:outline-none focus:ring-1"
      >
        <span className={selectedName ? 'text-gray-900' : 'text-gray-400'}>
          {selectedName || '-- Select --'}
        </span>
        <svg className="h-4 w-4 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40 cursor-pointer" onClick={() => { setOpen(false); setSearch(''); }} />
          <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
            <div className="p-2">
              <input
                autoFocus
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter prompts..."
                className="w-full rounded border border-gray-300 px-2.5 py-1.5 text-sm focus:border-primary-500 focus:ring-primary-500 focus:outline-none focus:ring-1"
              />
            </div>
            <div className="max-h-56 overflow-y-auto border-t border-gray-100">
              <button
                type="button"
                onClick={() => { onChange(''); setOpen(false); setSearch(''); }}
                className="w-full px-3 py-2 text-left text-sm text-gray-400 hover:bg-gray-50"
              >
                -- None --
              </button>
              {filtered.length === 0 && (
                <div className="px-3 py-3 text-center text-sm text-gray-400">No matches</div>
              )}
              {filtered.map((pv) => (
                <button
                  key={pv.id}
                  type="button"
                  onClick={() => { onChange(pv.id); setOpen(false); setSearch(''); }}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-gray-50 ${pv.id === value ? 'bg-primary-50 font-medium text-primary-700' : 'text-gray-700'}`}
                >
                  <span className="truncate">{pv.name || 'Untitled'}</span>
                  {pv.stats?.generationCount ? (
                    <span className="ml-auto shrink-0 text-xs text-gray-400">{pv.stats.generationCount} gen</span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
