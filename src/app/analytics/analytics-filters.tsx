'use client';

import { DateRangePicker } from '@/components/date-range-picker';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

function formatDisplay(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function AnalyticsFilters({ models }: { models: string[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const from = searchParams.get('from') ?? '';
  const to = searchParams.get('to') ?? '';
  const model = searchParams.get('model') ?? '';

  const applyFilters = useCallback(
    (overrides: Record<string, string>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(overrides)) {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      router.push(`/?${next}`);
    },
    [router, searchParams],
  );

  const clearAll = useCallback(() => {
    const tab = searchParams.get('tab');
    router.push(tab ? `/?tab=${tab}` : '/');
  }, [router, searchParams]);

  const hasDateFilter = !!(from || to);
  const hasAnyFilter = hasDateFilter || !!model;

  return (
    <div className="mt-6 flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <DateRangePicker
          from={from}
          to={to}
          onChange={(f, t) => applyFilters({ from: f, to: t })}
          onClear={() => applyFilters({ from: '', to: '' })}
        />

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
        </div>
      )}
    </div>
  );
}
