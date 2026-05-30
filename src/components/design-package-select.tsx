'use client';

import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { localUrl } from '@/lib/api-base';
import type { DesignPackageOption } from '@/lib/design-package';

function optionLabel(option: DesignPackageOption): string {
  return option.title?.trim() || option.name?.trim() || option.id;
}

export function DesignPackageSelect({
  value,
  onChange,
  retailerId,
}: {
  value: string;
  onChange: (value: string, option?: DesignPackageOption | null) => void;
  retailerId?: string;
}) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const focusOnMount = useCallback((node: HTMLInputElement | null) => node?.focus(), []);

  const {
    data: options = [],
    isLoading: loading,
    isError,
    error: queryError,
  } = useQuery({
    queryKey: ['design-packages', retailerId],
    queryFn: async ({ signal }) => {
      const url = new URL(localUrl('design-packages'), window.location.origin);
      if (retailerId) {
        url.searchParams.set('retailerId', retailerId);
      }
      const res = await fetch(url.toString(), { signal });
      if (!res.ok) throw new Error(`Failed to fetch design packages (${res.status})`);
      const json = (await res.json()) as { data?: DesignPackageOption[] };
      return Array.isArray(json.data) ? json.data : [];
    },
  });

  const error = isError
    ? queryError instanceof Error
      ? queryError.message
      : 'Failed to fetch design packages'
    : null;

  const hasCurrentValue = useMemo(
    () => !value || options.some((option) => option.id === value),
    [options, value],
  );
  const selectedOption = useMemo(
    () => options.find((option) => option.id === value) ?? null,
    [options, value],
  );
  const filteredOptions = useMemo(() => {
    const query = search.toLowerCase().trim();
    const base: DesignPackageOption[] =
      !hasCurrentValue && value ? [{ id: value, title: `Unknown package (${value})` }] : [];
    const source = [...base, ...options];
    if (!query) return source;
    return source.filter((option) => {
      const label = optionLabel(option).toLowerCase();
      const style = option.style?.toLowerCase() ?? '';
      return (
        label.includes(query) || option.id.toLowerCase().includes(query) || style.includes(query)
      );
    });
  }, [hasCurrentValue, options, search, value]);

  return (
    <div>
      <label
        htmlFor="design-package-trigger"
        className="mb-2 block text-xs font-medium tracking-wide text-gray-600 uppercase"
      >
        Design Package
      </label>
      <button
        id="design-package-trigger"
        type="button"
        onClick={() => setOpen(true)}
        disabled={loading}
        className="focus:border-primary-500 focus:ring-primary-500 flex w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-2 text-left text-sm transition-colors hover:border-gray-400 focus:ring-1 focus:outline-none disabled:bg-gray-50 disabled:text-gray-400"
      >
        <span
          className={
            selectedOption || (!hasCurrentValue && value)
              ? 'truncate text-gray-900'
              : 'text-gray-400'
          }
        >
          {selectedOption
            ? optionLabel(selectedOption)
            : !hasCurrentValue && value
              ? `Unknown package (${value})`
              : loading
                ? 'Loading packages...'
                : 'Select a design package'}
        </span>
        <svg
          className="size-4 shrink-0 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9"
          />
        </svg>
      </button>
      <p className="mt-2 text-xs text-gray-500">
        Required whenever a room preset layout is selected.
      </p>
      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/30 px-4 py-6">
          <button
            type="button"
            aria-label="Close design package picker"
            className="absolute inset-0 cursor-default"
            onClick={() => {
              setOpen(false);
              setSearch('');
            }}
          />
          <div className="relative w-full max-w-xl overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 uppercase">
                  Select Design Package
                </h3>
                <p className="mt-1 text-xs text-gray-500">Search by package title, style, or ID.</p>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => {
                  setOpen(false);
                  setSearch('');
                }}
                className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <svg
                  className="size-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="border-b border-gray-100 p-4">
              <input
                ref={focusOnMount}
                type="text"
                aria-label="Search packages"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search packages..."
                className="focus:border-primary-500 focus:ring-primary-500 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-1 focus:outline-none"
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
                <span className="font-medium">No design package</span>
                {value === '' ? (
                  <span className="bg-primary-100 rounded px-2 py-0.5 text-[10px] font-semibold">
                    Selected
                  </span>
                ) : null}
              </button>
              {filteredOptions.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-gray-400">
                  No matching packages.
                </div>
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
                    className={`flex w-full items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 text-left text-sm transition-colors last:border-b-0 ${
                      option.id === value
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{optionLabel(option)}</span>
                      {option.style ? (
                        <span className="block truncate text-[11px] text-gray-500">
                          {option.style}
                        </span>
                      ) : null}
                      <span className="block truncate font-mono text-[11px] text-gray-400">
                        {option.id}
                      </span>
                    </span>
                    {option.id === value ? (
                      <span className="bg-primary-100 rounded px-2 py-0.5 text-[10px] font-semibold">
                        Selected
                      </span>
                    ) : null}
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
