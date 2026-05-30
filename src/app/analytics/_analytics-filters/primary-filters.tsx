'use client';

import { DateRangePicker } from '@/components/date-range-picker';
import type { ApplyFilters } from './types';

const SOURCE_FILTER_OPTIONS = [
  { value: 'all', label: 'All runs' },
  { value: 'preset', label: 'Preset runs' },
  { value: 'raw_input', label: 'Real Input runs' },
  { value: 'benchmark', label: 'Benchmark runs' },
] as const;

function formatDisplay(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface PrimaryFiltersProps {
  models: string[];
  isCompare: boolean;
  from: string;
  to: string;
  model: string;
  source: string;
  hasDateFilter: boolean;
  hasAnyFilter: boolean;
  applyFilters: ApplyFilters;
  clearAll: () => void;
}

export function PrimaryFilters({
  models,
  isCompare,
  from,
  to,
  model,
  source,
  hasDateFilter,
  hasAnyFilter,
  applyFilters,
  clearAll,
}: PrimaryFiltersProps) {
  return (
    <>
      {/* ── Filter bar ── */}
      <div className="flex flex-wrap items-center gap-3">
        {!isCompare && (
          <DateRangePicker
            from={from}
            to={to}
            onChange={(f, t) => applyFilters({ from: f, to: t })}
            onClear={() => applyFilters({ from: '', to: '' })}
          />
        )}

        {models.length > 0 && !isCompare && <div className="h-6 w-px bg-gray-200" />}

        {models.length > 0 && !isCompare && (
          <div className="relative">
            <select
              value={model}
              onChange={(e) => applyFilters({ model: e.target.value })}
              className={`focus:ring-primary-100 appearance-none rounded-lg border py-1.5 pr-8 pl-3 text-xs font-medium transition-all focus:ring-2 focus:outline-none ${
                model
                  ? 'border-primary-200 bg-primary-50 text-primary-700'
                  : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <option value="">All models</option>
              {models.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
              <svg
                className="size-3.5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                />
              </svg>
            </div>
          </div>
        )}

        {!isCompare && (
          <>
            <div className="h-6 w-px bg-gray-200" />
            <div className="flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 p-1">
              {SOURCE_FILTER_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => applyFilters({ source: option.value })}
                  className={`rounded px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    source === option.value
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </>
        )}

        {!isCompare && hasAnyFilter && (
          <>
            <div className="h-6 w-px bg-gray-200" />
            <button
              type="button"
              onClick={clearAll}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-500 transition-colors hover:bg-red-50 hover:text-red-600"
            >
              <svg
                className="size-3.5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Reset
            </button>
          </>
        )}
      </div>

      {/* ── Active filter pills (non-comparison) ── */}
      {!isCompare && hasAnyFilter && (
        <div className="flex flex-wrap items-center gap-1.5">
          {hasDateFilter && (
            <span className="bg-primary-50 text-primary-700 ring-primary-200/60 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1">
              <svg
                className="size-3"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                />
              </svg>
              {from && to
                ? `${formatDisplay(from)} – ${formatDisplay(to)}`
                : from
                  ? `From ${formatDisplay(from)}`
                  : `Until ${formatDisplay(to)}`}
              <button
                type="button"
                aria-label="Remove date filter"
                onClick={() => applyFilters({ from: '', to: '' })}
                className="hover:bg-primary-200/60 ml-0.5 rounded-full p-0.5 transition-colors"
              >
                <svg
                  className="size-2.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={3}
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          )}
          {model && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-medium text-violet-700 ring-1 ring-violet-200/60">
              <svg
                className="size-3"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
                />
              </svg>
              {model}
              <button
                type="button"
                aria-label="Remove model filter"
                onClick={() => applyFilters({ model: '' })}
                className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-violet-200/60"
              >
                <svg
                  className="size-2.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={3}
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          )}
          {source !== 'all' && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700 ring-1 ring-blue-200/60">
              <svg
                className="size-3"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 7.5h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5"
                />
              </svg>
              {SOURCE_FILTER_OPTIONS.find((option) => option.value === source)?.label ?? source}
              <button
                type="button"
                aria-label="Remove source filter"
                onClick={() => applyFilters({ source: 'all' })}
                className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-blue-200/60"
              >
                <svg
                  className="size-2.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={3}
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          )}
        </div>
      )}
    </>
  );
}
