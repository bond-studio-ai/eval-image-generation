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
  initialPromptVersions?: PromptVersionItem[];
  initialPresets?: InputPresetItem[];
  initialDollhouseSource?: DollhouseSource;
}

export function PreviewPromptPage({
  initialPromptVersionId = null,
  initialPresetId = null,
  initialAreaSummary = null,
  initialPromptVersions,
  initialPresets,
  initialDollhouseSource,
}: PreviewPromptPageProps) {
  const [promptVersions, setPromptVersions] = useState<PromptVersionItem[]>(initialPromptVersions ?? []);
  const [presets, setPresets] = useState<InputPresetItem[]>(initialPresets ?? []);
  const [dollhouseSource, setDollhouseSource] = useState<DollhouseSource | null>(
    initialDollhouseSource ?? null
  );
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(initialPromptVersionId);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(initialPresetId);
  const [selectedAreaSummary, setSelectedAreaSummary] = useState<string | null>(initialAreaSummary);
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
  const hasInitialOptions = initialPromptVersions != null && initialPresets != null;
  const [loadingOptions, setLoadingOptions] = useState(!hasInitialOptions);

  useEffect(() => {
    if (hasInitialOptions) return;
    let cancelled = false;
    setLoadError(null);
    setLoadingOptions(true);
    async function load() {
      try {
        const [pvRes, presetRes] = await Promise.all([
          fetch(serviceUrl('prompt-versions?limit=100&minimal=true')),
          fetch(serviceUrl('input-presets?limit=100&minimal=true')),
        ]);
        if (cancelled) return;
        const pvJson = await pvRes.json();
        const presetJson = await presetRes.json();

        if (!pvRes.ok) {
          setLoadError(pvJson?.error?.message ?? 'Failed to load prompt versions');
          return;
        }
        if (!presetRes.ok) {
          setLoadError(presetJson?.error?.message ?? 'Failed to load input presets');
          return;
        }

        const pvData = Array.isArray(pvJson.data) ? pvJson.data : [];
        const presetData = Array.isArray(presetJson.data) ? presetJson.data : [];
        setPromptVersions(
          pvData.map((p: { id: string; name?: string | null }) => ({ id: p.id, name: p.name ?? null }))
        );
        setPresets(
          presetData.map((p: { id: string; name?: string | null }) => ({ id: p.id, name: p.name ?? null }))
        );
        try {
          const dollhouseRes = await fetch(serviceUrl('prompt-versions/preview/dollhouse-source'));
          const dollhouseJson = await dollhouseRes.json();
          if (!cancelled && dollhouseRes.ok) {
            setDollhouseSource(dollhouseJson.data ?? null);
          } else if (!cancelled && !dollhouseRes.ok) {
            setLoadError('Dollhouse preview is temporarily unavailable. Preset preview still works.');
          }
        } catch {
          if (!cancelled) {
            setLoadError('Dollhouse preview is temporarily unavailable. Preset preview still works.');
          }
        }
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
    if (!selectedPromptId || !selectedPresetId) {
      setPreviews([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(serviceUrl(`prompt-versions/${selectedPromptId}/preview`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputPresetId: selectedPresetId,
          ...(selectedAreaSummary ? { dollhouseAreaSummary: selectedAreaSummary } : {}),
        }),
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
  }, [selectedAreaSummary, selectedPresetId, selectedPromptId]);

  useEffect(() => {
    if (selectedPromptId && selectedPresetId) fetchPreview();
    else setPreviews([]);
  }, [fetchPreview, selectedAreaSummary, selectedPresetId, selectedPromptId]);

  useEffect(() => {
    if (selectedAreaSummary || !dollhouseSource?.defaultAreaSummary) return;
    setSelectedAreaSummary(dollhouseSource.defaultAreaSummary);
  }, [dollhouseSource, selectedAreaSummary]);

  useEffect(() => {
    if (dollhouseSource) return;
    let cancelled = false;

    async function loadDollhouseSource() {
      try {
        const res = await fetch(serviceUrl('prompt-versions/preview/dollhouse-source'));
        const json = await res.json();
        if (cancelled) return;
        if (res.ok) {
          setDollhouseSource(json.data ?? null);
          setLoadError((current) =>
            current === 'Dollhouse preview is temporarily unavailable. Preset preview still works.'
              ? null
              : current
          );
        }
      } catch {
        // Keep preset preview available even if dollhouse metadata can't load.
      }
    }

    loadDollhouseSource();
    return () => {
      cancelled = true;
    };
  }, [dollhouseSource]);

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
        subtitle="See how a prompt template renders with an input preset plus optional dollhouse area attributes."
      />

      {loadError && (
        <div className="mt-4">
          <ErrorCard message={loadError} />
        </div>
      )}

      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-5 shadow-xs">
        <p className="text-sm font-medium text-gray-700">Hardcoded dollhouse source</p>
        <p className="mt-1 text-sm text-gray-900">{dollhouseSource?.projectLabel ?? 'Unavailable'}</p>
        <p className="mt-2 text-sm text-gray-600">
          Input presets remain the base preview context. Selecting an area layers in hardcoded `dollhouse.*` attributes on top.
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
        </div>
        <div className="min-w-0">
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
              emptyMessage={dollhouseSource ? 'No dollhouse areas' : 'Dollhouse preview unavailable'}
            />
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-xs">
          <p className="text-sm font-medium text-gray-700">Selected preset</p>
          <p className="mt-1 text-sm text-gray-900">{selectedPreset?.name ?? 'None selected'}</p>
          <p className="mt-2 text-xs text-gray-500">
            Preset content remains the base prompt preview context.
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-xs">
          <p className="text-sm font-medium text-gray-700">Selected dollhouse area</p>
          <p className="mt-1 text-sm text-gray-900">{selectedArea?.summary ?? 'None selected'}</p>
          <p className="mt-2 break-all text-xs text-gray-500">
            {selectedArea?.imageUrl ?? 'The selected preset will still preview normally without dollhouse attributes.'}
          </p>
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
