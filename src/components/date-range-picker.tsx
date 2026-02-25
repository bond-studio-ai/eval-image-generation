'use client';

import { useEffect, useRef, useState } from 'react';

type Preset = { label: string; days: number };

const DATE_PRESETS: Preset[] = [
  { label: 'Today', days: 1 },
  { label: '3 days', days: 3 },
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
];

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatDisplay(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getPresetRange(days: number): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - (days - 1));
  return { from: formatDate(from), to: formatDate(to) };
}

function matchesPreset(from: string, to: string, days: number): boolean {
  const expected = getPresetRange(days);
  return from === expected.from && to === expected.to;
}

export function DateRangePicker({
  from,
  to,
  onChange,
  onClear,
}: {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
  onClear: () => void;
}) {
  const [showCustom, setShowCustom] = useState(false);
  const [customFrom, setCustomFrom] = useState(from);
  const [customTo, setCustomTo] = useState(to);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCustomFrom(from);
    setCustomTo(to);
  }, [from, to]);

  useEffect(() => {
    if (!showCustom) return;
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowCustom(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showCustom]);

  const activePreset = from && to
    ? DATE_PRESETS.find((p) => matchesPreset(from, to, p.days))
    : null;
  const hasCustomRange = from && to && !activePreset;
  const hasDateFilter = !!(from || to);

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 p-0.5">
        {DATE_PRESETS.map((preset) => (
          <button
            key={preset.days}
            type="button"
            onClick={() => {
              const range = getPresetRange(preset.days);
              onChange(range.from, range.to);
            }}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
              activePreset?.days === preset.days
                ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {preset.label}
          </button>
        ))}

        <div className="relative" ref={popoverRef}>
          <button
            type="button"
            onClick={() => setShowCustom((prev) => !prev)}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
              hasCustomRange
                ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200'
                : showCustom
                  ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200'
                  : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
            {hasCustomRange
              ? `${formatDisplay(from)} – ${formatDisplay(to)}`
              : 'Custom'}
          </button>

          {showCustom && (
            <div className="absolute left-0 top-full z-50 mt-2 w-72 rounded-xl border border-gray-200 bg-white p-4 shadow-lg">
              <p className="mb-3 text-xs font-medium text-gray-500">Custom date range</p>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-gray-400">From</label>
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700 transition-colors focus:border-primary-400 focus:bg-white focus:ring-2 focus:ring-primary-100 focus:outline-none"
                  />
                </div>
                <div className="mt-5 text-gray-300">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-gray-400">To</label>
                  <input
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700 transition-colors focus:border-primary-400 focus:bg-white focus:ring-2 focus:ring-primary-100 focus:outline-none"
                  />
                </div>
              </div>
              <div className="mt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCustom(false)}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onChange(customFrom, customTo);
                    setShowCustom(false);
                  }}
                  disabled={!customFrom || !customTo}
                  className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-40"
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {hasDateFilter && (
        <button
          type="button"
          onClick={onClear}
          className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          title="Clear date filter"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
