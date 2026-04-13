'use client';

import {
  COMPARE_COLUMN_QUERY_KEY,
  createEmptyComparisonColumn,
  encodeComparisonColumn,
  formatComparisonSource,
  parseComparisonState,
  type AnalyticsComparisonColumn,
  type AnalyticsComparisonSource,
} from '@/app/analytics/comparison-utils';
import { DateRangePicker } from '@/components/date-range-picker';
import type { StrategyListItem } from '@/lib/service-client';
import { browserTimezone } from '@/lib/api-base';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const SOURCE_FILTER_OPTIONS = [
  { value: 'all', label: 'All runs' },
  { value: 'preset', label: 'Preset runs' },
  { value: 'raw_input', label: 'Real Input runs' },
  { value: 'benchmark', label: 'Benchmark runs' },
] as const;

const COMPARISON_SOURCE_OPTIONS: AnalyticsComparisonSource[] = ['preset', 'raw_input', 'benchmark'];

function formatDisplay(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function StrategyDropdown({
  value,
  strategies,
  onChange,
}: {
  value: string;
  strategies: StrategyListItem[];
  onChange: (strategyId: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const selected = strategies.find((s) => s.id === value);

  useEffect(() => {
    if (!open) setSearch('');
  }, [open]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? strategies.filter((s) => s.name.toLowerCase().includes(q))
      : strategies;
    return list.slice(0, 30);
  }, [search, strategies]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex w-full items-center justify-between gap-2 rounded-lg border bg-white px-2.5 py-1.5 text-left text-xs transition-colors ${
          open
            ? 'border-primary-400 ring-1 ring-primary-400'
            : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        <span
          className={`truncate ${selected ? 'font-medium text-gray-900' : 'text-gray-400'}`}
        >
          {selected?.name ?? 'Select strategy…'}
        </span>
        <svg
          className={`h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 z-50 mt-1 w-full min-w-[240px] rounded-xl border border-gray-200 bg-white shadow-xl">
          <div className="border-b border-gray-100 p-2">
            <div className="relative">
              <svg
                className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search strategies…"
                autoFocus
                className="w-full rounded-md border border-gray-200 bg-gray-50 py-1.5 pl-8 pr-3 text-xs text-gray-700 placeholder:text-gray-400 focus:border-primary-300 focus:bg-white focus:ring-1 focus:ring-primary-300 focus:outline-none"
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-xs text-gray-500">No matching strategies</div>
            ) : (
              filtered.map((strategy) => (
                <button
                  key={strategy.id}
                  type="button"
                  onClick={() => {
                    onChange(strategy.id);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors ${
                    value === strategy.id
                      ? 'bg-primary-50 font-medium text-primary-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="truncate">{strategy.name}</span>
                  {value === strategy.id && (
                    <svg
                      className="ml-auto h-3.5 w-3.5 shrink-0 text-primary-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.5 12.75l6 6 9-13.5"
                      />
                    </svg>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function AnalyticsFilters({
  models,
  strategies,
  activeTab,
}: {
  models: string[];
  strategies: StrategyListItem[];
  activeTab: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isCompare = activeTab === 'compare';

  const from = searchParams.get('from') ?? '';
  const to = searchParams.get('to') ?? '';
  const model = searchParams.get('model') ?? '';
  const source = searchParams.get('source') ?? 'all';
  const comparison = parseComparisonState(searchParams);

  const columnsRef = useRef(comparison.columns);
  columnsRef.current = comparison.columns;

  const hasInitializedRef = useRef(false);
  useEffect(() => {
    if (isCompare && comparison.columns.length === 0 && !hasInitializedRef.current) {
      hasInitializedRef.current = true;
      const defaultSource: AnalyticsComparisonSource =
        source === 'raw_input' ? 'raw_input' : source === 'benchmark' ? 'benchmark' : 'preset';
      const defaultCol = createEmptyComparisonColumn({ from, to, source: defaultSource });
      const next = new URLSearchParams(searchParams.toString());
      next.append(COMPARE_COLUMN_QUERY_KEY, encodeComparisonColumn(defaultCol));
      router.replace(`/?${next}`);
    }
    if (!isCompare) hasInitializedRef.current = false;
  }, [isCompare, comparison.columns.length, from, to, source, searchParams, router]);

  const buildUrl = useCallback(
    (mutate: (next: URLSearchParams) => void) => {
      const next = new URLSearchParams(searchParams.toString());
      mutate(next);
      return `/?${next}`;
    },
    [searchParams],
  );

  const applyFilters = useCallback(
    (overrides: Record<string, string>) => {
      router.replace(
        buildUrl((next) => {
          for (const [key, value] of Object.entries(overrides)) {
            if (value) next.set(key, value);
            else next.delete(key);
          }
          const tz = browserTimezone();
          if (tz && (next.has('from') || next.has('to'))) next.set('tz', tz);
          else next.delete('tz');
        }),
      );
    },
    [router, buildUrl],
  );

  const updateComparisonColumns = useCallback(
    (columns: AnalyticsComparisonColumn[]) => {
      router.replace(
        buildUrl((next) => {
          next.delete(COMPARE_COLUMN_QUERY_KEY);
          for (const column of columns) {
            next.append(COMPARE_COLUMN_QUERY_KEY, encodeComparisonColumn(column));
          }
        }),
      );
    },
    [router, buildUrl],
  );

  const addComparisonColumn = useCallback(() => {
    const cols = columnsRef.current;
    const lastColumn = cols.at(-1);
    const defaultSource: AnalyticsComparisonSource =
      source === 'raw_input' ? 'raw_input' : source === 'benchmark' ? 'benchmark' : 'preset';
    updateComparisonColumns([
      ...cols,
      createEmptyComparisonColumn(
        lastColumn ?? { from, to, source: defaultSource },
      ),
    ]);
  }, [from, source, to, updateComparisonColumns]);

  const clearAll = useCallback(() => {
    const tab = searchParams.get('tab');
    const next = new URLSearchParams();
    if (tab) next.set('tab', tab);
    router.replace(`/${next.toString() ? `?${next}` : ''}`);
  }, [router, searchParams]);

  const hasDateFilter = !!(from || to);
  const hasAnyFilter = hasDateFilter || !!model || source !== 'all';

  return (
    <div className="mt-4 flex flex-col gap-3">
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
              className={`appearance-none rounded-lg border py-1.5 pl-3 pr-8 text-xs font-medium transition-all focus:ring-2 focus:ring-primary-100 focus:outline-none ${
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
              <svg className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
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
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
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
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-medium text-primary-700 ring-1 ring-primary-200/60">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
              {from && to
                ? `${formatDisplay(from)} – ${formatDisplay(to)}`
                : from
                  ? `From ${formatDisplay(from)}`
                  : `Until ${formatDisplay(to)}`}
              <button
                type="button"
                onClick={() => applyFilters({ from: '', to: '' })}
                className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-primary-200/60"
              >
                <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          )}
          {model && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-medium text-violet-700 ring-1 ring-violet-200/60">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              {model}
              <button
                type="button"
                onClick={() => applyFilters({ model: '' })}
                className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-violet-200/60"
              >
                <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          )}
          {source !== 'all' && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700 ring-1 ring-blue-200/60">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 7.5h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5" />
              </svg>
              {SOURCE_FILTER_OPTIONS.find((option) => option.value === source)?.label ?? source}
              <button
                type="button"
                onClick={() => applyFilters({ source: 'all' })}
                className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-blue-200/60"
              >
                <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          )}
        </div>
      )}

      {/* ── Comparison column builder ── */}
      {isCompare && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-xs">
          <div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/80">
                  <th className="w-10 px-3 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                    #
                  </th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-500" style={{ minWidth: 200 }}>
                    Strategy
                  </th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                    Date range
                  </th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                    Source
                  </th>
                  <th className="w-10 px-3 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {comparison.columns.map((column, index) => (
                  <tr key={index} className="group">
                    <td className="px-3 py-2.5 text-center text-xs font-medium text-gray-400">
                      {index + 1}
                    </td>
                    <td className="px-3 py-2.5" style={{ minWidth: 200 }}>
                      <StrategyDropdown
                        value={column.strategyId}
                        strategies={strategies}
                        onChange={(strategyId) => {
                          const nextColumns = [...comparison.columns];
                          nextColumns[index] = { ...column, strategyId };
                          updateComparisonColumns(nextColumns);
                        }}
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <DateRangePicker
                        from={column.from}
                        to={column.to}
                        onChange={(f, t) => {
                          const nextColumns = [...comparison.columns];
                          nextColumns[index] = { ...column, from: f, to: t };
                          updateComparisonColumns(nextColumns);
                        }}
                        onClear={() => {
                          const nextColumns = [...comparison.columns];
                          nextColumns[index] = { ...column, from: '', to: '' };
                          updateComparisonColumns(nextColumns);
                        }}
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-0.5 rounded-lg border border-gray-200 bg-gray-50 p-0.5">
                        {COMPARISON_SOURCE_OPTIONS.map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => {
                              const nextColumns = [...comparison.columns];
                              nextColumns[index] = { ...column, source: s };
                              updateComparisonColumns(nextColumns);
                            }}
                            className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                              column.source === s
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                          >
                            {formatComparisonSource(s)}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <button
                        type="button"
                        onClick={() =>
                          updateComparisonColumns(
                            comparison.columns.filter((_, i) => i !== index),
                          )
                        }
                        disabled={comparison.columns.length <= 1}
                        className="rounded-lg p-1 text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-300"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-gray-100 px-4 py-3">
            <button
              type="button"
              onClick={addComparisonColumn}
              className="inline-flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-2 text-xs font-medium text-gray-600 transition-colors hover:border-gray-400 hover:bg-gray-50 hover:text-gray-700"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add column
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
