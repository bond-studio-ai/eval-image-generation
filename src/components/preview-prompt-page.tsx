"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import { PageHeader } from "@/components/page-header";
import { ErrorCard } from "@/components/resource-form-header";
import { ChevronDownIcon } from "@/components/ui/icons";
import { assertNever } from "@/lib/assert-never";
import { serviceUrl } from "@/lib/api-base";
import { fetchJson } from "@/lib/api/client";
import { parseOrFallback } from "@/lib/api/parse";
import { dollhouseSourceResponseSchema, errorEnvelopeSchema, minimalListResponseSchema, previewResponseSchema } from "@/lib/api/schemas";

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

interface PreviewOptions {
  promptVersions: PromptVersionItem[];
  presets: InputPresetItem[];
}

interface PreviewPromptPageProps {
  initialPromptVersionId?: string | null;
  initialPresetId?: string | null;
  initialAreaSummary?: string | null;
  initialPromptVersions?: PromptVersionItem[];
  initialPresets?: InputPresetItem[];
  initialDollhouseSource?: DollhouseSource;
}

interface DropdownWithSearchProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  triggerId?: string;
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
}

function DropdownWithSearch({ containerRef, triggerId, open, setOpen, search, setSearch, placeholder, options, selectedId, selectedLabel, onSelectId, emptyMessage }: DropdownWithSearchProps) {
  const focusOnMount = useCallback((node: HTMLInputElement | null) => node?.focus(), []);
  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        id={triggerId}
        onClick={() => {
          setOpen(!open);
        }}
        className="focus:border-primary-500 focus:ring-primary-500 border-border bg-surface hover:border-border-strong text-body flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left shadow-xs transition-colors focus:ring-1"
      >
        <span className={selectedLabel ? "text-text-primary" : "text-text-muted"}>{selectedLabel || placeholder}</span>
        <ChevronDownIcon className={`text-text-disabled h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="border-border bg-surface absolute top-full right-0 left-0 z-20 mt-1 max-h-64 overflow-hidden rounded-lg border shadow-lg">
          <div className="border-border border-b p-2">
            <input
              ref={focusOnMount}
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
              }}
              placeholder="Search…"
              aria-label="Search"
              className="focus:border-primary-500 focus:ring-primary-500 border-border text-body w-full rounded-md border px-3 py-1.5 focus:ring-1"
            />
          </div>
          <ul className="max-h-48 overflow-auto py-1">
            {options.length === 0 ? (
              <li className="text-text-muted text-body px-3 py-2">{emptyMessage}</li>
            ) : (
              options.map((option) => (
                <li key={option.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectId(option.id);
                      setOpen(false);
                    }}
                    className={`hover:bg-surface-muted text-body w-full px-3 py-2 text-left ${selectedId === option.id ? "bg-primary-50 text-primary-800" : "text-text-primary"}`}
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
}

interface DropdownState {
  selectedId: string | null;
  open: boolean;
  search: string;
}

type DropdownAction = { type: "select"; id: string | null } | { type: "setOpen"; open: boolean } | { type: "setSearch"; search: string };

function errorMessageOr(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function dropdownReducer(state: DropdownState, action: DropdownAction): DropdownState {
  switch (action.type) {
    case "select": {
      return { ...state, selectedId: action.id };
    }
    case "setOpen": {
      return { ...state, open: action.open };
    }
    case "setSearch": {
      return { ...state, search: action.search };
    }
    default: {
      return assertNever(action);
    }
  }
}

const DOLLHOUSE_UNAVAILABLE_MESSAGE = "Dollhouse preview is temporarily unavailable. Preset preview still works.";

export function PreviewPromptPage({ initialPromptVersionId = null, initialPresetId = null, initialAreaSummary = null, initialPromptVersions, initialPresets, initialDollhouseSource }: PreviewPromptPageProps) {
  const [promptDropdown, promptDispatch] = useReducer(dropdownReducer, {
    selectedId: initialPromptVersionId,
    open: false,
    search: ""
  });
  const [presetDropdown, presetDispatch] = useReducer(dropdownReducer, {
    selectedId: initialPresetId,
    open: false,
    search: ""
  });
  const [areaDropdown, areaDispatch] = useReducer(dropdownReducer, {
    selectedId: initialAreaSummary,
    open: false,
    search: ""
  });
  const selectedPromptId = promptDropdown.selectedId;
  const selectedPresetId = presetDropdown.selectedId;
  const selectedAreaSummary = areaDropdown.selectedId;
  const promptRef = useRef<HTMLDivElement>(null);
  const presetRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const hasInitialOptions = initialPromptVersions != null && initialPresets != null;

  const optionsQuery = useQuery({
    queryKey: ["preview-options"],
    queryFn: async ({ signal }): Promise<PreviewOptions> => {
      const [pvRes, presetRes] = await Promise.all([fetch(serviceUrl("prompt-versions?limit=100&minimal=true"), { signal }), fetch(serviceUrl("input-presets?limit=100&minimal=true"), { signal })]);
      const [pvRaw, presetRaw] = await Promise.all([pvRes.json() as Promise<unknown>, presetRes.json() as Promise<unknown>]);
      const pvJson = parseOrFallback(minimalListResponseSchema, pvRaw, { data: [] }, "preview prompt versions");
      const presetJson = parseOrFallback(minimalListResponseSchema, presetRaw, { data: [] }, "preview input presets");
      if (!pvRes.ok) {
        throw new Error(pvJson.error?.message ?? "Failed to load prompt versions");
      }
      if (!presetRes.ok) {
        throw new Error(presetJson.error?.message ?? "Failed to load input presets");
      }
      return {
        promptVersions: pvJson.data.map((promptVersion) => ({
          id: promptVersion.id,
          name: promptVersion.name ?? null
        })),
        presets: presetJson.data.map((preset) => ({
          id: preset.id,
          name: preset.name ?? null
        }))
      };
    },
    enabled: !hasInitialOptions,
    initialData: initialPromptVersions != null && initialPresets != null ? { promptVersions: initialPromptVersions, presets: initialPresets } : undefined
  });

  const dollhouseQuery = useQuery({
    queryKey: ["dollhouse-source"],
    queryFn: async ({ signal }): Promise<DollhouseSource | null> => {
      const json = await fetchJson(serviceUrl("prompt-versions/preview/dollhouse-source"), dollhouseSourceResponseSchema, { signal });
      return json.data ?? null;
    },
    enabled: initialDollhouseSource == null,
    initialData: initialDollhouseSource ?? undefined
  });

  const promptVersions = useMemo(() => optionsQuery.data?.promptVersions ?? initialPromptVersions ?? [], [optionsQuery.data, initialPromptVersions]);
  const presets = useMemo(() => optionsQuery.data?.presets ?? initialPresets ?? [], [optionsQuery.data, initialPresets]);
  const dollhouseSource = dollhouseQuery.data ?? null;

  const previewEnabled = Boolean(selectedPromptId) && Boolean(selectedPresetId);
  const previewQuery = useQuery({
    queryKey: ["preview", selectedPromptId, selectedPresetId, selectedAreaSummary],
    queryFn: async ({ signal }): Promise<PreviewItem[]> => {
      const res = await fetch(serviceUrl(`prompt-versions/${selectedPromptId ?? ""}/preview`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inputPresetId: selectedPresetId,
          ...(selectedAreaSummary ? { dollhouseAreaSummary: selectedAreaSummary } : {})
        }),
        signal
      });
      if (!res.ok) {
        const errorJson: unknown = await res.json();
        throw new Error(parseOrFallback(errorEnvelopeSchema, errorJson, {}, "prompt preview").error?.message || "Failed to load preview");
      }
      const json: unknown = await res.json();
      const preview = parseOrFallback(previewResponseSchema, json, { data: null }, "prompt preview").data;
      return preview ? [preview] : [];
    },
    enabled: previewEnabled
  });

  const loadingOptions = !hasInitialOptions && optionsQuery.isLoading;
  const optionsErrorMessage = optionsQuery.isError ? errorMessageOr(optionsQuery.error, "Failed to load options") : null;
  const loadError = optionsErrorMessage || (!hasInitialOptions && optionsQuery.isSuccess && dollhouseQuery.isError ? DOLLHOUSE_UNAVAILABLE_MESSAGE : null);

  const previews = previewEnabled ? (previewQuery.data ?? []) : [];
  const loading = previewEnabled && previewQuery.isLoading;
  const error = previewEnabled && previewQuery.isError ? errorMessageOr(previewQuery.error, "Preview failed") : null;

  const filteredPrompts = useMemo(() => {
    const query = promptDropdown.search.trim().toLowerCase();
    if (!query) return promptVersions;
    return promptVersions.filter((promptVersion) => (promptVersion.name ?? "").toLowerCase().includes(query));
  }, [promptVersions, promptDropdown.search]);

  const filteredPresets = useMemo(() => {
    const query = presetDropdown.search.trim().toLowerCase();
    if (!query) return presets;
    return presets.filter((preset) => (preset.name ?? "").toLowerCase().includes(query));
  }, [presets, presetDropdown.search]);

  const filteredAreas = useMemo(() => {
    const query = areaDropdown.search.trim().toLowerCase();
    const areas = dollhouseSource?.areas ?? [];
    if (!query) return areas;
    return areas.filter((area) => area.summary.toLowerCase().includes(query));
  }, [areaDropdown.search, dollhouseSource]);

  const selectedPrompt = useMemo(() => promptVersions.find((promptVersion) => promptVersion.id === selectedPromptId), [promptVersions, selectedPromptId]);
  const selectedPreset = useMemo(() => presets.find((preset) => preset.id === selectedPresetId), [presets, selectedPresetId]);
  const selectedArea = useMemo(() => (dollhouseSource?.areas ?? []).find((area) => area.summary === selectedAreaSummary), [dollhouseSource, selectedAreaSummary]);

  useEffect(() => {
    if (selectedAreaSummary || !dollhouseSource?.defaultAreaSummary) return;
    areaDispatch({ type: "select", id: dollhouseSource.defaultAreaSummary });
  }, [dollhouseSource, selectedAreaSummary]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (promptRef.current && !promptRef.current.contains(e.target as Node)) {
        promptDispatch({ type: "setOpen", open: false });
      }
      if (presetRef.current && !presetRef.current.contains(e.target as Node)) {
        presetDispatch({ type: "setOpen", open: false });
      }
      if (areaRef.current && !areaRef.current.contains(e.target as Node)) {
        areaDispatch({ type: "setOpen", open: false });
      }
    };
    document.addEventListener("mousedown", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
    };
  }, []);

  return (
    <div>
      <PageHeader title="Prompt Preview" subtitle="See how a prompt template renders with an input preset plus optional dollhouse area attributes." />

      {loadError && (
        <div className="mt-4">
          <ErrorCard message={loadError} />
        </div>
      )}

      <div className="border-border bg-surface mt-6 rounded-lg border p-5 shadow-xs">
        <p className="text-text-secondary text-body font-medium">Hardcoded dollhouse source</p>
        <p className="text-text-primary text-body mt-1">{dollhouseSource?.projectLabel ?? "Unavailable"}</p>
        <p className="text-text-secondary text-body mt-2">Input presets remain the base preview context. Selecting an area layers in hardcoded `dollhouse.*` attributes on top.</p>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="min-w-0">
          <label htmlFor="preview-prompt-version" className="text-text-secondary text-caption mb-1.5 block font-medium">
            Prompt version
          </label>
          {loadingOptions ? (
            <p className="border-border bg-surface-muted text-text-muted text-body rounded-lg border px-3 py-2">Loading…</p>
          ) : (
            <DropdownWithSearch
              containerRef={promptRef}
              triggerId="preview-prompt-version"
              open={promptDropdown.open}
              setOpen={(open) => {
                promptDispatch({ type: "setOpen", open });
              }}
              search={promptDropdown.search}
              setSearch={(search) => {
                promptDispatch({ type: "setSearch", search });
              }}
              placeholder="Select prompt version…"
              options={filteredPrompts.map((prompt) => ({
                id: prompt.id,
                label: prompt.name || "Untitled"
              }))}
              selectedId={selectedPrompt?.id ?? null}
              selectedLabel={selectedPrompt?.name || null}
              onSelectId={(id) => {
                promptDispatch({ type: "select", id });
              }}
              emptyMessage="No prompt versions"
            />
          )}
        </div>
        <div className="min-w-0">
          <label htmlFor="preview-input-preset" className="text-text-secondary text-caption mb-1.5 block font-medium">
            Input preset
          </label>
          {loadingOptions ? (
            <p className="border-border bg-surface-muted text-text-muted text-body rounded-lg border px-3 py-2">Loading…</p>
          ) : (
            <DropdownWithSearch
              containerRef={presetRef}
              triggerId="preview-input-preset"
              open={presetDropdown.open}
              setOpen={(open) => {
                presetDispatch({ type: "setOpen", open });
              }}
              search={presetDropdown.search}
              setSearch={(search) => {
                presetDispatch({ type: "setSearch", search });
              }}
              placeholder="Select input preset…"
              options={filteredPresets.map((preset) => ({
                id: preset.id,
                label: preset.name || "Untitled"
              }))}
              selectedId={selectedPreset?.id ?? null}
              selectedLabel={selectedPreset?.name || null}
              onSelectId={(id) => {
                presetDispatch({ type: "select", id });
              }}
              emptyMessage="No presets"
            />
          )}
        </div>
        <div className="min-w-0">
          <label htmlFor="preview-dollhouse-area" className="text-text-secondary text-caption mb-1.5 block font-medium">
            Dollhouse area
          </label>
          {loadingOptions ? (
            <p className="border-border bg-surface-muted text-text-muted text-body rounded-lg border px-3 py-2">Loading…</p>
          ) : (
            <DropdownWithSearch
              containerRef={areaRef}
              triggerId="preview-dollhouse-area"
              open={areaDropdown.open}
              setOpen={(open) => {
                areaDispatch({ type: "setOpen", open });
              }}
              search={areaDropdown.search}
              setSearch={(search) => {
                areaDispatch({ type: "setSearch", search });
              }}
              placeholder="Select dollhouse area…"
              options={filteredAreas.map((area) => ({ id: area.summary, label: area.summary }))}
              selectedId={selectedArea?.summary ?? null}
              selectedLabel={selectedArea?.summary || null}
              onSelectId={(id) => {
                areaDispatch({ type: "select", id });
              }}
              emptyMessage={dollhouseSource ? "No dollhouse areas" : "Dollhouse preview unavailable"}
            />
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="border-border bg-surface rounded-lg border p-5 shadow-xs">
          <p className="text-text-secondary text-body font-medium">Selected preset</p>
          <p className="text-text-primary text-body mt-1">{selectedPreset?.name ?? "None selected"}</p>
          <p className="text-text-muted text-caption mt-2">Preset content remains the base prompt preview context.</p>
        </div>
        <div className="border-border bg-surface rounded-lg border p-5 shadow-xs">
          <p className="text-text-secondary text-body font-medium">Selected dollhouse area</p>
          <p className="text-text-primary text-body mt-1">{selectedArea?.summary ?? "None selected"}</p>
          <p className="text-text-muted text-caption mt-2 break-all">{selectedArea?.imageUrl ?? "The selected preset will still preview normally without dollhouse attributes."}</p>
        </div>
      </div>

      {error && (
        <div className="mt-4">
          <ErrorCard message={error} />
        </div>
      )}
      {loading && <p className="text-text-muted text-body mt-4">Loading preview…</p>}

      {previews.length > 0 && !loading && (
        <div className="border-border bg-surface mt-8 grid h-[65vh] min-h-[300px] grid-cols-1 grid-rows-1 gap-6 rounded-lg border p-6 shadow-xs sm:grid-cols-2">
          <div className="flex min-h-0 min-w-0 flex-col">
            <h2 className="text-text-muted text-body mb-2 shrink-0 font-semibold uppercase">System prompt</h2>
            <pre className="border-border bg-surface-muted text-text-secondary text-body min-h-0 flex-1 overflow-y-auto rounded-lg border p-4 whitespace-pre-wrap">{previews[0]?.systemPrompt || "(empty)"}</pre>
          </div>
          <div className="flex min-h-0 min-w-0 flex-col">
            <h2 className="text-text-muted text-body mb-2 shrink-0 font-semibold uppercase">User prompt</h2>
            <pre className="border-border bg-surface-muted text-text-secondary text-body min-h-0 flex-1 overflow-y-auto rounded-lg border p-4 whitespace-pre-wrap">{previews[0]?.userPrompt || "(empty)"}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
