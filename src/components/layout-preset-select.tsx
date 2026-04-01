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
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [options, setOptions] = useState<LayoutPresetOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div>
      <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-600">
        Layout
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={loading}
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none disabled:bg-gray-50 disabled:text-gray-400"
      >
        <option value="">{loading ? 'Loading layouts...' : 'Select a layout'}</option>
        {!hasCurrentValue && value ? (
          <option value={value}>{`Unknown layout (${value})`}</option>
        ) : null}
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
      <p className="mt-2 text-xs text-gray-500">
        Saved instead of a dollhouse upload. Runtime will resolve the room from this preset.
      </p>
      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
