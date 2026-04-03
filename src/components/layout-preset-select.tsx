'use client';

import { serviceUrl } from '@/lib/api-base';
import { useEffect, useMemo, useState } from 'react';

export interface LayoutPresetOption {
  id: string;
  name: string;
  rawName?: string;
}

export function LayoutPresetSelect({
  value,
  onChange,
  onResolvedOptionChange,
}: {
  value: string;
  onChange: (value: string, option?: LayoutPresetOption | null) => void;
  onResolvedOptionChange?: (option: LayoutPresetOption | null) => void;
}) {
  const [options, setOptions] = useState<LayoutPresetOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch(serviceUrl('layout-presets'))
      .then(async (res) => {
        if (!res.ok) throw new Error(`Failed to fetch presets (${res.status})`);
        const json = (await res.json()) as { data?: LayoutPresetOption[] };
        if (cancelled) return;
        setOptions(Array.isArray(json.data) ? json.data : []);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setOptions([]);
        setError(err instanceof Error ? err.message : 'Failed to fetch layout presets');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const hasCurrentValue = useMemo(
    () => !value || options.some((option) => option.id === value),
    [options, value]
  );
  const selectedOption = useMemo(
    () => options.find((option) => option.id === value) ?? null,
    [options, value]
  );

  useEffect(() => {
    onResolvedOptionChange?.(selectedOption);
  }, [onResolvedOptionChange, selectedOption]);
  const filteredOptions = useMemo(() => {
    const query = search.toLowerCase().trim();
    const base = !hasCurrentValue && value
      ? [{ id: value, name: `Unknown layout (${value})` }]
      : [];
    const source = [...base, ...options];
    if (!query) return source;
    return source.filter((option) =>
      option.name.toLowerCase().includes(query) || option.id.toLowerCase().includes(query)
    );
  }, [hasCurrentValue, options, search, value]);

  return (
    <div>
      <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-600">
        Layout
      </label>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={loading}
        className="flex w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-2 text-left text-sm transition-colors hover:border-gray-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none disabled:bg-gray-50 disabled:text-gray-400"
      >
        <span className={selectedOption || (!hasCurrentValue && value) ? 'truncate text-gray-900' : 'text-gray-400'}>
          {selectedOption?.name ?? (!hasCurrentValue && value ? `Unknown layout (${value})` : loading ? 'Loading layouts...' : 'Select a layout')}
        </span>
        <svg className="h-4 w-4 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
        </svg>
      </button>
      <p className="mt-2 text-xs text-gray-500">
        Saved instead of a dollhouse upload. Runtime will resolve the room from this preset.
      </p>
      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/30 px-4 py-6">
          <div
            className="absolute inset-0"
            onClick={() => {
              setOpen(false);
              setSearch('');
            }}
          />
          <div className="relative w-full max-w-xl overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <h3 className="text-sm font-semibold uppercase text-gray-900">Select Layout</h3>
                <p className="mt-1 text-xs text-gray-500">Search by layout name or preset ID.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setSearch('');
                }}
                className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="border-b border-gray-100 p-4">
              <input
                autoFocus
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search layouts..."
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
              />
            </div>
            <div className="max-h-[26rem] overflow-y-auto">
              <button
                type="button"
                onClick={() => {
                  onChange('', null);
                  setOpen(false);
                  setSearch('');
                }}
                className={`flex w-full items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 text-left text-sm transition-colors ${
                  value === '' ? 'bg-primary-50 text-primary-700' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="font-medium">No layout preset</span>
                {value === '' ? <span className="rounded bg-primary-100 px-2 py-0.5 text-[10px] font-semibold">Selected</span> : null}
              </button>
              {filteredOptions.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-gray-400">No matching layouts.</div>
              ) : (
                filteredOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => {
                      onChange(option.id, option);
                      setOpen(false);
                      setSearch('');
                    }}
                    className={`flex w-full items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 text-left text-sm last:border-b-0 transition-colors ${
                      option.id === value ? 'bg-primary-50 text-primary-700' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{option.name}</span>
                      <span className="block truncate font-mono text-[11px] text-gray-400">{option.id}</span>
                    </span>
                    {option.id === value ? <span className="rounded bg-primary-100 px-2 py-0.5 text-[10px] font-semibold">Selected</span> : null}
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
