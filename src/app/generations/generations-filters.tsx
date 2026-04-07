'use client';

import type { PromptVersionListItem } from '@/lib/types';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { buildGenerationsQuery, type FilterParams } from './query-utils';

export function GenerationsFilters({
  params,
  promptVersions,
}: {
  params: FilterParams;
  promptVersions: PromptVersionListItem[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const link = useCallback(
    (overrides: Partial<FilterParams>) => buildGenerationsQuery({ ...params, ...overrides }),
    [params],
  );

  const handleDateApply = useCallback(
    (from: string, to: string) => {
      const next = new URLSearchParams(searchParams.toString());
      next.set('tab', 'generations');
      if (from) next.set('from', from);
      else next.delete('from');
      if (to) next.set('to', to);
      else next.delete('to');
      router.push(`/executions?${next}`);
    },
    [router, searchParams],
  );

  const hasAny =
    params.scene_accuracy_rating ||
    params.product_accuracy_rating ||
    params.unrated ||
    params.prompt_version_id ||
    params.from ||
    params.to ||
    params.source === 'benchmark';

  return (
    <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4 shadow-xs">
      <div className="flex flex-wrap items-start gap-x-6 gap-y-3">
        {/* Rating filters */}
        <FilterGroup label="Scene">
          {['GOOD', 'FAILED'].map((r) => (
            <FilterChip
              key={`scene-${r}`}
              href={link({
                scene_accuracy_rating: params.scene_accuracy_rating === r ? undefined : r,
                unrated: undefined,
              })}
              active={params.scene_accuracy_rating === r}
              variant={r === 'GOOD' ? 'green' : 'red'}
            >
              {r === 'GOOD' ? 'Good' : 'Failed'}
            </FilterChip>
          ))}
        </FilterGroup>

        <FilterGroup label="Product">
          {['GOOD', 'FAILED'].map((r) => (
            <FilterChip
              key={`product-${r}`}
              href={link({
                product_accuracy_rating: params.product_accuracy_rating === r ? undefined : r,
                unrated: undefined,
              })}
              active={params.product_accuracy_rating === r}
              variant={r === 'GOOD' ? 'green' : 'red'}
            >
              {r === 'GOOD' ? 'Good' : 'Failed'}
            </FilterChip>
          ))}
        </FilterGroup>

        <FilterGroup label="Status">
          <FilterChip
            href={link({
              unrated: params.unrated === 'true' ? undefined : 'true',
              scene_accuracy_rating: undefined,
              product_accuracy_rating: undefined,
            })}
            active={params.unrated === 'true'}
            variant="amber"
          >
            Unrated only
          </FilterChip>
        </FilterGroup>

        {/* Prompt filter */}
        <FilterGroup label="Prompt">
          <select
            value={params.prompt_version_id ?? ''}
            onChange={(e) => {
              const id = e.target.value || undefined;
              router.push(buildGenerationsQuery({ ...params, prompt_version_id: id }));
            }}
            className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-700 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
          >
            <option value="">All prompts</option>
            {promptVersions.map((pv) => (
              <option key={pv.id} value={pv.id}>
                {pv.name ?? 'Untitled'}
              </option>
            ))}
          </select>
        </FilterGroup>

        {/* Date range */}
        <FilterGroup label="Date range">
          <DateRangeForm from={params.from} to={params.to} onApply={handleDateApply} />
        </FilterGroup>

        {/* Sort */}
        <FilterGroup label="Sort">
          <FilterChip
            href={link({ order: 'desc' })}
            active={params.order !== 'asc'}
            variant="neutral"
          >
            Newest
          </FilterChip>
          <FilterChip
            href={link({ order: 'asc' })}
            active={params.order === 'asc'}
            variant="neutral"
          >
            Oldest
          </FilterChip>
        </FilterGroup>
      </div>

      {hasAny && (
        <div className="mt-3 border-t border-gray-100 pt-3">
          <Link
            href={buildGenerationsQuery({ source: params.source })}
            className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Clear all filters
          </Link>
        </div>
      )}
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs font-medium text-gray-500">{label}:</span>
      <div className="flex items-center gap-1">{children}</div>
    </div>
  );
}

const chipVariants = {
  green: { active: 'bg-green-100 text-green-800 ring-1 ring-green-300', inactive: 'bg-gray-100 text-gray-600 hover:bg-gray-200' },
  red: { active: 'bg-red-100 text-red-800 ring-1 ring-red-300', inactive: 'bg-gray-100 text-gray-600 hover:bg-gray-200' },
  amber: { active: 'bg-amber-100 text-amber-800 ring-1 ring-amber-300', inactive: 'bg-gray-100 text-gray-600 hover:bg-gray-200' },
  neutral: { active: 'bg-primary-100 text-primary-700 ring-1 ring-primary-300', inactive: 'bg-gray-100 text-gray-600 hover:bg-gray-200' },
};

function FilterChip({
  href,
  active,
  variant,
  children,
}: {
  href: string;
  active: boolean;
  variant: keyof typeof chipVariants;
  children: React.ReactNode;
}) {
  const v = chipVariants[variant];
  return (
    <Link
      href={href}
      className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${active ? v.active : v.inactive}`}
    >
      {children}
    </Link>
  );
}

function DateRangeForm({
  from,
  to,
  onApply,
}: {
  from?: string;
  to?: string;
  onApply: (from: string, to: string) => void;
}) {
  return (
    <form
      className="flex items-center gap-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fromInput = form.querySelector<HTMLInputElement>('[name="from"]');
        const toInput = form.querySelector<HTMLInputElement>('[name="to"]');
        onApply(fromInput?.value ?? '', toInput?.value ?? '');
      }}
    >
      <input
        type="date"
        name="from"
        defaultValue={from}
        className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-700 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
      />
      <span className="text-xs text-gray-400">–</span>
      <input
        type="date"
        name="to"
        defaultValue={to}
        className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-700 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
      />
      <button
        type="submit"
        className="rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200"
      >
        Apply
      </button>
    </form>
  );
}
