'use client';

import {
  COMPARE_COLUMN_QUERY_KEY,
  COMPARE_QUERY_KEY,
  COMPARE_RANGE_QUERY_KEY,
  COMPARE_SOURCE_QUERY_KEY,
  COMPARE_STRATEGY_QUERY_KEY,
  createEmptyComparisonColumn,
  encodeComparisonColumn,
  formatComparisonSource,
  parseComparisonState,
  type AnalyticsComparisonColumn,
  type AnalyticsComparisonSource,
} from '@/app/analytics/comparison-utils';
import { DateRangePicker } from '@/components/date-range-picker';
import type { StrategyListItem } from '@/lib/service-client';
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

function StrategySearchSelect({
  value,
  strategies,
  onChange,
  compact,
}: {
  value: string;
  strategies: StrategyListItem[];
  onChange: (strategyId: string) => void;
  compact?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selectedStrategy = strategies.find((strategy) => strategy.id === value);

  useEffect(() => {
    setQuery(selectedStrategy?.name ?? '');
  }, [selectedStrategy]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  const filteredStrategies = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return strategies.slice(0, 20);
    return strategies
      .filter((strategy) => strategy.name.toLowerCase().includes(normalized))
      .slice(0, 20);
  }, [query, strategies]);

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <svg
          className={`absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 ${compact ? 'h-3 w-3' : 'h-3.5 w-3.5'}`}
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
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            if (value) onChange('');
          }}
          placeholder="Search strategy…"
          className={`w-full rounded-lg border border-gray-200 bg-white text-gray-700 placeholder:text-gray-400 focus:border-primary-400 focus:ring-1 focus:ring-primary-400 focus:outline-none ${
            compact ? 'py-1.5 pl-8 pr-8 text-xs' : 'py-2 pl-9 pr-9 text-sm'
          }`}
        />
        {(query || value) && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              onChange('');
              setOpen(false);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <svg className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {open && (
        <div className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white p-1 shadow-lg">
          {filteredStrategies.length === 0 ? (
            <div className="px-3 py-2 text-xs text-gray-500">No matching strategies</div>
          ) : (
            filteredStrategies.map((strategy) => (
              <button
                key={strategy.id}
                type="button"
                onClick={() => {
                  onChange(strategy.id);
                  setQuery(strategy.name);
                  setOpen(false);
                }}
                className={`flex w-full items-center rounded-lg px-3 py-1.5 text-left text-xs transition-colors ${
                  value === strategy.id
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="truncate">{strategy.name}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function AnalyticsFilters({
  models,
  strategies,
}: {
  models: string[];
  strategies: StrategyListItem[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const from = searchParams.get('from') ?? '';
  const to = searchParams.get('to') ?? '';
  const model = searchParams.get('model') ?? '';
  const source = searchParams.get('source') ?? 'all';
  const comparison = parseComparisonState(searchParams);

  const applyParams = useCallback(
    (mutate: (next: URLSearchParams) => void) => {
      const next = new URLSearchParams(searchParams.toString());
      mutate(next);
      router.push(`/?${next}`);
    },
    [router, searchParams],
  );

  const applyFilters = useCallback(
    (overrides: Record<string, string>) => {
      applyParams((next) => {
        for (const [key, value] of Object.entries(overrides)) {
          if (value) next.set(key, value);
          else next.delete(key);
        }
      });
    },
    [applyParams],
  );

  const updateComparisonColumns = useCallback(
    (columns: AnalyticsComparisonColumn[]) => {
      applyParams((next) => {
        next.delete(COMPARE_COLUMN_QUERY_KEY);
        next.delete(COMPARE_RANGE_QUERY_KEY);
        next.delete(COMPARE_STRATEGY_QUERY_KEY);
        next.delete(COMPARE_SOURCE_QUERY_KEY);
        for (const column of columns) {
          next.append(COMPARE_COLUMN_QUERY_KEY, encodeComparisonColumn(column));
        }
      });
    },
    [applyParams],
  );

  const setComparisonEnabled = useCallback(
    (enabled: boolean) => {
      applyParams((next) => {
        if (!enabled) {
          next.delete(COMPARE_QUERY_KEY);
          next.delete(COMPARE_COLUMN_QUERY_KEY);
          next.delete(COMPARE_RANGE_QUERY_KEY);
          next.delete(COMPARE_STRATEGY_QUERY_KEY);
          next.delete(COMPARE_SOURCE_QUERY_KEY);
          return;
        }

        next.set(COMPARE_QUERY_KEY, '1');
        const currentState = parseComparisonState(next);
        if (currentState.columns.length === 0) {
          const defaultSource: AnalyticsComparisonSource =
            source === 'raw_input' ? 'raw_input' : source === 'benchmark' ? 'benchmark' : 'preset';
          next.append(
            COMPARE_COLUMN_QUERY_KEY,
            encodeComparisonColumn(
              createEmptyComparisonColumn({ from, to, source: defaultSource }),
            ),
          );
        }
        next.delete(COMPARE_RANGE_QUERY_KEY);
        next.delete(COMPARE_STRATEGY_QUERY_KEY);
        next.delete(COMPARE_SOURCE_QUERY_KEY);
      });
    },
    [applyParams, from, source, to],
  );

  const addComparisonColumn = useCallback(() => {
    const lastColumn = comparison.columns.at(-1);
    const defaultSource: AnalyticsComparisonSource =
      source === 'raw_input' ? 'raw_input' : source === 'benchmark' ? 'benchmark' : 'preset';
    updateComparisonColumns([
      ...comparison.columns,
      createEmptyComparisonColumn(
        lastColumn ?? { from, to, source: defaultSource },
      ),
    ]);
  }, [comparison.columns, from, source, to, updateComparisonColumns]);

  const clearAll = useCallback(() => {
    const tab = searchParams.get('tab');
    const next = new URLSearchParams();
    if (tab) next.set('tab', tab);
    router.push(`/${next.toString() ? `?${next}` : ''}`);
  }, [router, searchParams]);

  const hasDateFilter = !!(from || to);
  const hasAnyFilter =
    hasDateFilter ||
    !!model ||
    source !== 'all' ||
    comparison.enabled ||
    comparison.columns.length > 0;

  return (
    <div className="mt-6 flex flex-col gap-3">
      {/* ── Filter bar ── */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 select-none">
          <input
            type="checkbox"
            checked={comparison.enabled}
            onChange={(event) => setComparisonEnabled(event.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          Compare
        </label>

        {!comparison.enabled && (
          <DateRangePicker
            from={from}
            to={to}
            onChange={(f, t) => applyFilters({ from: f, to: t })}
            onClear={() => applyFilters({ from: '', to: '' })}
          />
        )}

        {models.length > 0 && <div className="h-6 w-px bg-gray-200" />}

        {models.length > 0 && (
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

        {!comparison.enabled && (
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

        {hasAnyFilter && (
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
      {!comparison.enabled && hasAnyFilter && (
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
      {comparison.enabled && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
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
                  <tr key={`${index}-${encodeComparisonColumn(column)}`} className="group">
                    <td className="px-3 py-2.5 text-center text-xs font-medium text-gray-400">
                      {index + 1}
                    </td>
                    <td className="px-3 py-2.5" style={{ minWidth: 200 }}>
                      <StrategySearchSelect
                        value={column.strategyId}
                        strategies={strategies}
                        compact
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
