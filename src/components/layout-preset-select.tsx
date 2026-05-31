"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { ChevronsUpDownIcon, XIcon } from "@/components/ui/icons";
import { serviceUrl } from "@/lib/api-base";

export interface LayoutPresetOption {
  id: string;
  name: string;
  rawName?: string;
}

/**
 * Shared layout-presets fetch. Both this select and its parent forms read from
 * it (react-query dedupes by `queryKey`), so the parent can resolve a preset
 * id to its name top-down instead of the child shipping the resolved option
 * back up through an effect.
 */
export function useLayoutPresets() {
  const {
    data: options = [],
    isLoading: loading,
    isError,
    error: queryError
  } = useQuery({
    queryKey: ["layout-presets"],
    queryFn: async ({ signal }) => {
      const res = await fetch(serviceUrl("layout-presets"), { signal });
      if (!res.ok) throw new Error(`Failed to fetch presets (${res.status})`);
      const json = (await res.json()) as { data?: LayoutPresetOption[] };
      return Array.isArray(json.data) ? json.data : [];
    }
  });

  const error = isError ? (queryError instanceof Error ? queryError.message : "Failed to fetch layout presets") : null;

  return { options, loading, error };
}

export function LayoutPresetSelect({ value, onChange }: { value: string; onChange: (value: string, option?: LayoutPresetOption | null) => void }) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const focusOnMount = useCallback((node: HTMLInputElement | null) => node?.focus(), []);

  const { options, loading, error } = useLayoutPresets();

  const hasCurrentValue = useMemo(() => !value || options.some((option) => option.id === value), [options, value]);
  const selectedOption = useMemo(() => options.find((option) => option.id === value) ?? null, [options, value]);

  const filteredOptions = useMemo(() => {
    const query = search.toLowerCase().trim();
    const base = !hasCurrentValue && value ? [{ id: value, name: `Unknown layout (${value})` }] : [];
    const source = [...base, ...options];
    if (!query) return source;
    return source.filter((option) => option.name.toLowerCase().includes(query) || option.id.toLowerCase().includes(query));
  }, [hasCurrentValue, options, search, value]);

  return (
    <div>
      <span className="text-text-secondary text-caption mb-2 block font-medium tracking-wide uppercase">Layout</span>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
        }}
        disabled={loading}
        className="focus:border-primary-500 focus:ring-primary-500 border-border-strong bg-surface disabled:bg-surface-muted disabled:text-text-disabled hover:border-border-strong text-body flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors focus:ring-1 focus:outline-none"
      >
        <span className={selectedOption || (!hasCurrentValue && value) ? "text-text-primary truncate" : "text-text-disabled"}>
          {selectedOption?.name ?? (!hasCurrentValue && value ? `Unknown layout (${value})` : loading ? "Loading layouts..." : "Select a layout")}
        </span>
        <ChevronsUpDownIcon className="text-text-disabled size-4 shrink-0" />
      </button>
      <p className="text-text-muted text-caption mt-2">Saved instead of a dollhouse upload. Runtime will resolve the room from this preset.</p>
      {error ? <p className="text-danger-600 text-caption mt-2">{error}</p> : null}
      {open ? (
        <div className="bg-overlay/30 fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 cursor-default"
            onClick={() => {
              setOpen(false);
              setSearch("");
            }}
          />
          <div className="border-border bg-surface relative w-full max-w-xl overflow-hidden rounded-xl border shadow-2xl">
            <div className="border-border-subtle flex items-center justify-between border-b px-5 py-4">
              <div>
                <h3 className="text-text-primary text-body font-semibold uppercase">Select Layout</h3>
                <p className="text-text-muted text-caption mt-1">Search by layout name or preset ID.</p>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => {
                  setOpen(false);
                  setSearch("");
                }}
                className="text-text-disabled hover:bg-surface-sunken hover:text-text-secondary rounded-md p-1 transition-colors"
              >
                <XIcon className="size-5" />
              </button>
            </div>
            <div className="border-border-subtle border-b p-4">
              <input
                ref={focusOnMount}
                type="text"
                aria-label="Search layouts"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                }}
                placeholder="Search layouts..."
                className="focus:border-primary-500 focus:ring-primary-500 border-border-strong text-body w-full rounded-md border px-3 py-2 focus:ring-1 focus:outline-none"
              />
            </div>
            <div className="max-h-[26rem] overflow-y-auto">
              <button
                type="button"
                onClick={() => {
                  onChange("", null);
                  setOpen(false);
                  setSearch("");
                }}
                className={`border-border-subtle text-body flex w-full items-center justify-between gap-3 border-b px-4 py-3 text-left transition-colors ${value === "" ? "bg-primary-50 text-primary-700" : "text-text-secondary hover:bg-surface-muted"}`}
              >
                <span className="font-medium">No layout preset</span>
                {value === "" ? <span className="bg-primary-100 rounded px-2 py-0.5 text-[10px] font-semibold">Selected</span> : null}
              </button>
              {filteredOptions.length === 0 ? (
                <div className="text-text-disabled text-body px-4 py-8 text-center">No matching layouts.</div>
              ) : (
                filteredOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => {
                      onChange(option.id, option);
                      setOpen(false);
                      setSearch("");
                    }}
                    className={`border-border-subtle text-body flex w-full items-center justify-between gap-3 border-b px-4 py-3 text-left transition-colors last:border-b-0 ${
                      option.id === value ? "bg-primary-50 text-primary-700" : "text-text-secondary hover:bg-surface-muted"
                    }`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{option.name}</span>
                      <span className="text-text-disabled block truncate font-mono text-[11px]">{option.id}</span>
                    </span>
                    {option.id === value ? <span className="bg-primary-100 rounded px-2 py-0.5 text-[10px] font-semibold">Selected</span> : null}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
