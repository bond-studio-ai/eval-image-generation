'use client';

import {
  COMPARE_QUERY_KEY,
  COMPARE_RANGE_QUERY_KEY,
  COMPARE_SOURCE_QUERY_KEY,
  COMPARE_STRATEGY_QUERY_KEY,
  encodeComparisonRange,
  formatComparisonRange,
  formatComparisonSource,
  parseComparisonState,
  type AnalyticsComparisonRange,
  type AnalyticsComparisonSource,
} from '@/app/analytics/comparison-utils';
import { DateRangePicker } from '@/components/date-range-picker';
import type { StrategyListItem } from '@/lib/service-client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

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

function ComparisonFilterPanel({
  ranges,
  strategyIds,
  strategies,
  sources,
  onRangesChange,
  onStrategiesChange,
  onSourcesChange,
}: {
  ranges: AnalyticsComparisonRange[];
  strategyIds: string[];
  strategies: StrategyListItem[];
  sources: AnalyticsComparisonSource[];
  onRangesChange: (ranges: AnalyticsComparisonRange[]) => void;
  onStrategiesChange: (strategyIds: string[]) => void;
  onSourcesChange: (sources: AnalyticsComparisonSource[]) => void;
}) {
  const strategySet = new Set(strategyIds);
  const sourceSet = new Set(sources);
  const visibleRanges = ranges.length > 0 ? ranges : [{ from: '', to: '' }];

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-xs">
      <div className="grid gap-4 lg:grid-cols-3">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-600">Date ranges</h3>
            <button
              type="button"
              onClick={() => onRangesChange([...ranges, { from: '', to: '' }])}
              className="rounded-md border border-gray-200 px-2 py-1 text-[11px] font-medium text-gray-600 hover:bg-gray-50"
            >
              Add range
            </button>
          </div>
          <div className="space-y-2">
            {visibleRanges.map((range, index) => (
              <div key={`${range.from}-${range.to}-${index}`} className="rounded-md border border-gray-200 p-2">
                <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
                  <input
                    type="date"
                    value={range.from}
                    onChange={(event) => {
                      const next = [...visibleRanges];
                      next[index] = { ...range, from: event.target.value };
                      onRangesChange(next);
                    }}
                    className="rounded-md border border-gray-200 px-2 py-1.5 text-xs text-gray-700"
                  />
                  <input
                    type="date"
                    value={range.to}
                    onChange={(event) => {
                      const next = [...visibleRanges];
                      next[index] = { ...range, to: event.target.value };
                      onRangesChange(next);
                    }}
                    className="rounded-md border border-gray-200 px-2 py-1.5 text-xs text-gray-700"
                  />
                  <button
                    type="button"
                    onClick={() => onRangesChange(visibleRanges.filter((_, currentIndex) => currentIndex !== index))}
                    className="rounded-md px-2 text-xs font-medium text-red-500 hover:bg-red-50"
                    disabled={visibleRanges.length === 1}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-600">Strategies</h3>
            <button
              type="button"
              onClick={() => onStrategiesChange(strategySet.size === strategies.length ? [] : strategies.map((strategy) => strategy.id))}
              className="rounded-md border border-gray-200 px-2 py-1 text-[11px] font-medium text-gray-600 hover:bg-gray-50"
            >
              {strategySet.size === strategies.length ? 'Clear all' : 'Select all'}
            </button>
          </div>
          <div className="max-h-56 overflow-y-auto rounded-md border border-gray-200 bg-gray-50 p-2">
            <div className="space-y-1.5">
              {strategies.map((strategy) => {
                const selected = strategySet.has(strategy.id);
                return (
                  <label
                    key={strategy.id}
                    className="flex cursor-pointer items-center gap-2 rounded-md bg-white px-2 py-1.5 text-xs text-gray-700"
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => {
                        const next = new Set(strategySet);
                        if (selected) next.delete(strategy.id);
                        else next.add(strategy.id);
                        onStrategiesChange([...next]);
                      }}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <span className="truncate">{strategy.name}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-600">Sources</h3>
          <div className="space-y-2 rounded-md border border-gray-200 bg-gray-50 p-2">
            {(['preset', 'raw_input'] as AnalyticsComparisonSource[]).map((value) => {
              const selected = sourceSet.has(value);
              return (
                <label
                  key={value}
                  className="flex cursor-pointer items-center gap-2 rounded-md bg-white px-2 py-1.5 text-xs text-gray-700"
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => {
                      const next = new Set(sourceSet);
                      if (selected) next.delete(value);
                      else next.add(value);
                      onSourcesChange([...next] as AnalyticsComparisonSource[]);
                    }}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <span>{formatComparisonSource(value)}</span>
                </label>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-gray-500">
        {ranges
          .filter((range) => range.from && range.to)
          .map((range) => (
            <span key={encodeComparisonRange(range)} className="rounded-full bg-slate-100 px-2 py-1">
              {formatComparisonRange(range)}
            </span>
          ))}
      </div>
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

  const setComparisonEnabled = useCallback(
    (enabled: boolean) => {
      applyParams((next) => {
        if (!enabled) {
          next.delete(COMPARE_QUERY_KEY);
          next.delete(COMPARE_RANGE_QUERY_KEY);
          next.delete(COMPARE_STRATEGY_QUERY_KEY);
          next.delete(COMPARE_SOURCE_QUERY_KEY);
          return;
        }

        const currentState = parseComparisonState(next);
        next.set(COMPARE_QUERY_KEY, '1');
        if (currentState.ranges.length === 0 && from && to) {
          next.append(COMPARE_RANGE_QUERY_KEY, encodeComparisonRange({ from, to }));
        }
        if (currentState.sources.length === 0) {
          next.delete(COMPARE_SOURCE_QUERY_KEY);
          if (source === 'preset' || source === 'raw_input') next.append(COMPARE_SOURCE_QUERY_KEY, source);
          else {
            next.append(COMPARE_SOURCE_QUERY_KEY, 'preset');
            next.append(COMPARE_SOURCE_QUERY_KEY, 'raw_input');
          }
        }
        next.delete('from');
        next.delete('to');
        next.delete('source');
      });
    },
    [applyParams, from, source, to],
  );

  const updateComparisonRanges = useCallback(
    (ranges: AnalyticsComparisonRange[]) => {
      applyParams((next) => {
        next.delete(COMPARE_RANGE_QUERY_KEY);
        for (const range of ranges) next.append(COMPARE_RANGE_QUERY_KEY, encodeComparisonRange(range));
      });
    },
    [applyParams],
  );

  const updateComparisonStrategies = useCallback(
    (strategyIds: string[]) => {
      applyParams((next) => {
        next.delete(COMPARE_STRATEGY_QUERY_KEY);
        for (const strategyId of strategyIds) next.append(COMPARE_STRATEGY_QUERY_KEY, strategyId);
      });
    },
    [applyParams],
  );

  const updateComparisonSources = useCallback(
    (sources: AnalyticsComparisonSource[]) => {
      applyParams((next) => {
        next.delete(COMPARE_SOURCE_QUERY_KEY);
        for (const value of sources) next.append(COMPARE_SOURCE_QUERY_KEY, value);
      });
    },
    [applyParams],
  );

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
    comparison.ranges.length > 0 ||
    comparison.strategyIds.length > 0 ||
    comparison.sources.length > 0;
  return (
    <div className="mt-6 flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700">
          <input
            type="checkbox"
            checked={comparison.enabled}
            onChange={(event) => setComparisonEnabled(event.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          Comparison mode
        </label>

        {!comparison.enabled && (
          <DateRangePicker
            from={from}
            to={to}
            onChange={(f, t) => applyFilters({ from: f, to: t })}
            onClear={() => applyFilters({ from: '', to: '' })}
          />
        )}

        {/* Divider */}
        {models.length > 0 && <div className="h-6 w-px bg-gray-200" />}

        {/* Model filter */}
        {models.length > 0 && (
          <div className="relative">
            <select
              value={model}
              onChange={(e) => applyFilters({ model: e.target.value })}
              className={`appearance-none rounded-lg border py-1.5 pr-8 pl-3 text-xs font-medium transition-all focus:ring-2 focus:ring-primary-100 focus:outline-none ${
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

        <div className="h-6 w-px bg-gray-200" />

        {!comparison.enabled ? (
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
        ) : (
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
            Select multiple ranges, strategies, and sources below. The matrix will generate one column per combination.
          </div>
        )}

        {/* Clear all */}
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

      {/* Active filter pills */}
      {hasAnyFilter && (
        <div className="flex flex-wrap items-center gap-1.5">
          {!comparison.enabled && hasDateFilter && (
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
          {comparison.enabled && (
            <>
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700 ring-1 ring-slate-200">
                {comparison.ranges.length} range{comparison.ranges.length === 1 ? '' : 's'}
              </span>
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700 ring-1 ring-slate-200">
                {comparison.strategyIds.length} strateg{comparison.strategyIds.length === 1 ? 'y' : 'ies'}
              </span>
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700 ring-1 ring-slate-200">
                {comparison.sources.length} source{comparison.sources.length === 1 ? '' : 's'}
              </span>
            </>
          )}
        </div>
      )}

      {comparison.enabled && (
        <ComparisonFilterPanel
          ranges={comparison.ranges}
          strategyIds={comparison.strategyIds}
          strategies={strategies}
          sources={comparison.sources}
          onRangesChange={updateComparisonRanges}
          onStrategiesChange={updateComparisonStrategies}
          onSourcesChange={updateComparisonSources}
        />
      )}
    </div>
  );
}
