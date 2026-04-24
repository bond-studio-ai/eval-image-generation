'use client';

import { PageHeader } from '@/components/page-header';
import { ErrorCard } from '@/components/resource-form-header';
import { serviceUrl } from '@/lib/api-base';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface PromptVersionItem {
  id: string;
  name: string | null;
}

interface InputPresetItem {
  id: string;
  name: string | null;
}

interface DollhouseAreaItem {
  summary: string;
  imageUrl: string;
  priority: number;
}

interface DollhouseSource {
  projectId: string;
  projectLabel: string;
  defaultAreaSummary: string | null;
  areas: DollhouseAreaItem[];
}

interface PreviewItem {
  systemPrompt: string;
  userPrompt: string;
}

interface PreviewPromptPageProps {
  initialPromptVersionId?: string | null;
  initialPresetId?: string | null;
  initialAreaSummary?: string | null;
  initialMode?: 'preset' | 'dollhouse';
  initialPromptVersions?: PromptVersionItem[];
  initialPresets?: InputPresetItem[];
  initialDollhouseSource?: DollhouseSource;
}

export function PreviewPromptPage({
  initialPromptVersionId = null,
  initialPresetId = null,
  initialAreaSummary = null,
  initialMode = 'preset',
  initialPromptVersions,
  initialPresets,
  initialDollhouseSource,
}: PreviewPromptPageProps) {
  const [promptVersions, setPromptVersions] = useState<PromptVersionItem[]>(initialPromptVersions ?? []);
  const [presets, setPresets] = useState<InputPresetItem[]>(initialPresets ?? []);
  const [dollhouseSource, setDollhouseSource] = useState<DollhouseSource | null>(initialDollhouseSource ?? null);
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(initialPromptVersionId);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(initialPresetId);
  const [selectedAreaSummary, setSelectedAreaSummary] = useState<string | null>(initialAreaSummary);
  const [previewMode, setPreviewMode] = useState<'preset' | 'dollhouse'>(initialMode);
  const [promptDropdownOpen, setPromptDropdownOpen] = useState(false);
  const [presetDropdownOpen, setPresetDropdownOpen] = useState(false);
  const [areaDropdownOpen, setAreaDropdownOpen] = useState(false);
  const [promptSearch, setPromptSearch] = useState('');
  const [presetSearch, setPresetSearch] = useState('');
  const [areaSearch, setAreaSearch] = useState('');
  const promptRef = useRef<HTMLDivElement>(null);
  const presetRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const [previews, setPreviews] = useState<PreviewItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const hasInitialOptions =
    initialPromptVersions != null && initialPresets != null && initialDollhouseSource != null;
  const [loadingOptions, setLoadingOptions] = useState(!hasInitialOptions);

  useEffect(() => {
    if (hasInitialOptions) return;
    let cancelled = false;
    setLoadError(null);
    setLoadingOptions(true);
    async function load() {
      try {
        const [pvRes, presetRes, dollhouseRes] = await Promise.all([
          fetch(serviceUrl('prompt-versions?limit=100&minimal=true')),
          fetch(serviceUrl('input-presets?limit=100&minimal=true')),
          fetch(serviceUrl('prompt-versions/preview/dollhouse-source')),
        ]);
        if (cancelled) return;
        const pvJson = await pvRes.json();
        const presetJson = await presetRes.json();
        const dollhouseJson = await dollhouseRes.json();

        if (!pvRes.ok) {
          setLoadError(pvJson?.error?.message ?? 'Failed to load prompt versions');
          return;
        }
        if (!presetRes.ok) {
          setLoadError(presetJson?.error?.message ?? 'Failed to load input presets');
          return;
        }
        if (!dollhouseRes.ok) {
          setLoadError(dollhouseJson?.error?.message ?? 'Failed to load dollhouse source');
          return;
        }

        const pvData = Array.isArray(pvJson.data) ? pvJson.data : [];
        const presetData = Array.isArray(presetJson.data) ? presetJson.data : [];
        setPromptVersions(pvData.map((p: { id: string; name?: string | null }) => ({ id: p.id, name: p.name ?? null })));
        setPresets(
          presetData.map((p: { id: string; name?: string | null }) => ({ id: p.id, name: p.name ?? null }))
        );
        setDollhouseSource(dollhouseJson.data ?? null);
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Failed to load options');
        }
      } finally {
        if (!cancelled) setLoadingOptions(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [hasInitialOptions]);

  const filteredPrompts = useMemo(() => {
    const q = promptSearch.trim().toLowerCase();
    if (!q) return promptVersions;
    return promptVersions.filter((p) => (p.name ?? '').toLowerCase().includes(q));
  }, [promptVersions, promptSearch]);

  const filteredPresets = useMemo(() => {
    const q = presetSearch.trim().toLowerCase();
    if (!q) return presets;
    return presets.filter((preset) => (preset.name ?? '').toLowerCase().includes(q));
  }, [presets, presetSearch]);

  const filteredAreas = useMemo(() => {
    const q = areaSearch.trim().toLowerCase();
    const areas = dollhouseSource?.areas ?? [];
    if (!q) return areas;
    return areas.filter((area) => area.summary.toLowerCase().includes(q));
  }, [areaSearch, dollhouseSource]);

  const selectedPrompt = useMemo(
    () => promptVersions.find((p) => p.id === selectedPromptId),
    [promptVersions, selectedPromptId],
  );
  const selectedPreset = useMemo(
    () => presets.find((preset) => preset.id === selectedPresetId),
    [presets, selectedPresetId],
  );
  const selectedArea = useMemo(
    () => (dollhouseSource?.areas ?? []).find((area) => area.summary === selectedAreaSummary),
    [dollhouseSource, selectedAreaSummary],
  );

  const fetchPreview = useCallback(async () => {
    if (!selectedPromptId) {
      setPreviews([]);
      return;
    }
    if (previewMode === 'preset' && !selectedPresetId) {
      setPreviews([]);
      return;
    }
    if (previewMode === 'dollhouse' && !selectedAreaSummary) {
      setPreviews([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const body =
        previewMode === 'preset'
          ? { inputPresetId: selectedPresetId }
          : { dollhouseAreaSummary: selectedAreaSummary };
      const res = await fetch(serviceUrl(`prompt-versions/${selectedPromptId}/preview`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error?.message || 'Failed to load preview');
      }
      const json = await res.json();
      const preview = json.data;
      setPreviews(preview ? [preview] : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Preview failed');
      setPreviews([]);
    } finally {
      setLoading(false);
    }
  }, [previewMode, selectedAreaSummary, selectedPresetId, selectedPromptId]);

  useEffect(() => {
    const hasSourceSelection =
      previewMode === 'preset' ? !!selectedPresetId : !!selectedAreaSummary;
    if (selectedPromptId && hasSourceSelection) fetchPreview();
    else setPreviews([]);
  }, [fetchPreview, previewMode, selectedAreaSummary, selectedPresetId, selectedPromptId]);

  useEffect(() => {
    if (selectedAreaSummary || !dollhouseSource?.defaultAreaSummary) return;
    setSelectedAreaSummary(dollhouseSource.defaultAreaSummary);
  }, [dollhouseSource, selectedAreaSummary]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (promptRef.current && !promptRef.current.contains(e.target as Node)) {
        setPromptDropdownOpen(false);
      }
      if (presetRef.current && !presetRef.current.contains(e.target as Node)) {
        setPresetDropdownOpen(false);
      }
      if (areaRef.current && !areaRef.current.contains(e.target as Node)) {
        setAreaDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const DropdownWithSearch = ({
    containerRef,
    open,
    setOpen,
    search,
    setSearch,
    placeholder,
    options,
    selectedId,
    selectedLabel,
    onSelectId,
    emptyMessage,
  }: {
    containerRef: React.RefObject<HTMLDivElement | null>;
    open: boolean;
    setOpen: (v: boolean) => void;
    search: string;
    setSearch: (v: string) => void;
    placeholder: string;
    options: { id: string; label: string }[];
    selectedId?: string | null;
    selectedLabel?: string | null;
    onSelectId: (id: string) => void;
    emptyMessage: string;
  }) => (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-left text-sm shadow-xs transition-colors hover:border-gray-300 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
      >
        <span className={selectedLabel ? 'text-gray-900' : 'text-gray-500'}>
          {selectedLabel || placeholder}
        </span>
        <svg
          className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="border-b border-gray-200 p-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              autoFocus
            />
          </div>
          <ul className="max-h-48 overflow-auto py-1">
            {options.length === 0 ? (
              <li className="px-3 py-2 text-sm text-gray-500">{emptyMessage}</li>
            ) : (
              options.map((option) => (
                <li key={option.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectId(option.id);
                      setOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                      selectedId === option.id ? 'bg-primary-50 text-primary-800' : 'text-gray-900'
                    }`}
                  >
                    {option.label}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Prompt Preview"
        subtitle="See how a prompt template renders with either an input preset or a dollhouse area."
      />

      {loadError && (
        <div className="mt-4">
          <ErrorCard message={loadError} />
        </div>
      )}

      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-5 shadow-xs">
        <p className="text-sm font-medium text-gray-700">Preview source</p>
        <div className="mt-3 inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
          {(['preset', 'dollhouse'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setPreviewMode(mode)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                previewMode === mode
                  ? 'bg-white text-primary-700 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {mode === 'preset' ? 'Input preset' : 'Dollhouse area'}
            </button>
          ))}
        </div>
        <p className="mt-3 text-sm text-gray-600">
          {previewMode === 'preset'
            ? 'Use the original preset-based preview flow.'
            : 'Use the hardcoded dollhouse fixture and swap in area-specific `dollhouse.*` attributes.'}
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="min-w-0">
          <label className="mb-1.5 block text-xs font-medium text-gray-600">Prompt version</label>
          {loadingOptions ? (
            <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500">Loading…</p>
          ) : (
            <DropdownWithSearch
              containerRef={promptRef}
              open={promptDropdownOpen}
              setOpen={setPromptDropdownOpen}
              search={promptSearch}
              setSearch={setPromptSearch}
              placeholder="Select prompt version…"
              options={filteredPrompts.map((prompt) => ({ id: prompt.id, label: prompt.name || 'Untitled' }))}
              selectedId={selectedPrompt?.id ?? null}
              selectedLabel={selectedPrompt?.name || null}
              onSelectId={setSelectedPromptId}
              emptyMessage="No prompt versions"
            />
          )}
        </div>
        <div className="min-w-0">
          {previewMode === 'preset' ? (
            <>
              <label className="mb-1.5 block text-xs font-medium text-gray-600">Input preset</label>
              {loadingOptions ? (
                <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500">Loading…</p>
              ) : (
                <DropdownWithSearch
                  containerRef={presetRef}
                  open={presetDropdownOpen}
                  setOpen={setPresetDropdownOpen}
                  search={presetSearch}
                  setSearch={setPresetSearch}
                  placeholder="Select input preset…"
                  options={filteredPresets.map((preset) => ({ id: preset.id, label: preset.name || 'Untitled' }))}
                  selectedId={selectedPreset?.id ?? null}
                  selectedLabel={selectedPreset?.name || null}
                  onSelectId={setSelectedPresetId}
                  emptyMessage="No presets"
                />
              )}
            </>
          ) : (
            <>
              <label className="mb-1.5 block text-xs font-medium text-gray-600">Dollhouse area</label>
              {loadingOptions ? (
                <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500">Loading…</p>
              ) : (
                <DropdownWithSearch
                  containerRef={areaRef}
                  open={areaDropdownOpen}
                  setOpen={setAreaDropdownOpen}
                  search={areaSearch}
                  setSearch={setAreaSearch}
                  placeholder="Select dollhouse area…"
                  options={filteredAreas.map((area) => ({ id: area.summary, label: area.summary }))}
                  selectedId={selectedArea?.summary ?? null}
                  selectedLabel={selectedArea?.summary || null}
                  onSelectId={setSelectedAreaSummary}
                  emptyMessage="No dollhouse areas"
                />
              )}
            </>
          )}
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-xs">
          {previewMode === 'preset' ? (
            <>
              <p className="text-sm font-medium text-gray-700">Selected preset</p>
              <p className="mt-1 text-sm text-gray-900">{selectedPreset?.name ?? 'None selected'}</p>
              <p className="mt-2 text-xs text-gray-500">
                Preset preview uses the existing prompt rendering path with the selected input preset.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-gray-700">Hardcoded project</p>
              <p className="mt-1 text-sm text-gray-900">{dollhouseSource?.projectLabel ?? 'Loading…'}</p>
              <p className="mt-3 text-sm font-medium text-gray-700">Selected area</p>
              <p className="mt-1 text-sm text-gray-900">{selectedArea?.summary ?? 'None selected'}</p>
              <p className="mt-2 break-all text-xs text-gray-500">
                {selectedArea?.imageUrl ?? 'Choose an area to use its filtered dollhouse attributes.'}
              </p>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4">
          <ErrorCard message={error} />
        </div>
      )}
      {loading && <p className="mt-4 text-sm text-gray-500">Loading preview…</p>}

      {previews.length > 0 && !loading && (
        <div className="mt-8 grid h-[65vh] min-h-[300px] grid-cols-1 grid-rows-1 gap-6 rounded-lg border border-gray-200 bg-white p-6 shadow-xs sm:grid-cols-2">
          <div className="flex min-h-0 min-w-0 flex-col">
            <h2 className="mb-2 shrink-0 text-sm font-semibold uppercase text-gray-500">System prompt</h2>
            <pre className="min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-800">
              {previews[0]?.systemPrompt || '(empty)'}
            </pre>
          </div>
          <div className="flex min-h-0 min-w-0 flex-col">
            <h2 className="mb-2 shrink-0 text-sm font-semibold uppercase text-gray-500">User prompt</h2>
            <pre className="min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-800">
              {previews[0]?.userPrompt || '(empty)'}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
