'use client';

import type { InputPresetListItem, PromptVersionListItem } from '@/lib/queries';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useRef, useState } from 'react';

interface StepData {
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
  include_product_categories: string[];
  arbitrary_image_from_step: number | null;
}

const PRODUCT_CATEGORIES = [
  'faucets', 'lightings', 'lvps', 'mirrors', 'paints', 'robe_hooks',
  'shelves', 'shower_glasses', 'shower_systems', 'floor_tiles', 'wall_tiles',
  'shower_wall_tiles', 'shower_floor_tiles', 'shower_curb_tiles',
  'toilet_paper_holders', 'toilets', 'towel_bars', 'towel_rings',
  'tub_doors', 'tub_fillers', 'tubs', 'vanities', 'wallpapers',
] as const;

const PRODUCT_LABELS: Record<string, string> = {
  faucets: 'Faucets', lightings: 'Lightings', lvps: 'LVPs', mirrors: 'Mirrors', paints: 'Paints',
  robe_hooks: 'Robe hooks', shelves: 'Shelves', shower_glasses: 'Shower glasses', shower_systems: 'Shower systems',
  floor_tiles: 'Floor tiles', wall_tiles: 'Wall tiles', shower_wall_tiles: 'Shower wall tiles',
  shower_floor_tiles: 'Shower floor tiles', shower_curb_tiles: 'Shower curb tiles',
  toilet_paper_holders: 'Toilet paper holders', toilets: 'Toilets', towel_bars: 'Towel bars',
  towel_rings: 'Towel rings', tub_doors: 'Tub doors', tub_fillers: 'Tub fillers', tubs: 'Tubs',
  vanities: 'Vanities', wallpapers: 'Wallpapers',
};

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
    name: '',
    prompt_version_id: promptVersionId,
    model: 'gemini-2.5-flash-image',
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
    include_product_categories: [],
    arbitrary_image_from_step: null,
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
        steps: steps.map((s, i) => ({
          ...s,
          name: s.name.trim() || null,
          step_order: i + 1,
          temperature: s.temperature,
          include_dollhouse: s.include_dollhouse,
          include_real_photo: s.include_real_photo,
          include_mood_board: s.include_mood_board,
          include_product_categories: s.include_product_categories ?? [],
          arbitrary_image_from_step: s.arbitrary_image_from_step ?? null,
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
                    <div>
                      <p className="mb-1 text-xs text-gray-600">Specific products to use</p>
                      <div className="mb-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => updateStep(idx, { include_product_categories: [...PRODUCT_CATEGORIES] })}
                          className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
                        >
                          Select all
                        </button>
                        <button
                          type="button"
                          onClick={() => updateStep(idx, { include_product_categories: [] })}
                          className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
                        >
                          Deselect all
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3 md:grid-cols-4">
                        {PRODUCT_CATEGORIES.map((key) => (
                          <label key={key} className="flex cursor-pointer items-center gap-2 text-xs text-gray-700">
                            <input
                              type="checkbox"
                              checked={step.include_product_categories.includes(key)}
                              onChange={(e) => {
                                const next = e.target.checked
                                  ? [...step.include_product_categories, key]
                                  : step.include_product_categories.filter((c) => c !== key);
                                updateStep(idx, { include_product_categories: next });
                              }}
                              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                            {PRODUCT_LABELS[key] ?? key}
                          </label>
                        ))}
                      </div>
                    </div>
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
          <div className="fixed inset-0 z-40" onClick={() => { setOpen(false); setSearch(''); }} />
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
                  {pv.stats?.generation_count ? (
                    <span className="ml-auto shrink-0 text-xs text-gray-400">{pv.stats.generation_count} gen</span>
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
