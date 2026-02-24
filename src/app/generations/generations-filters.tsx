'use client';

import type { PromptVersionListItem } from '@/lib/queries';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

type FilterParams = {
  prompt_version_id?: string;
  scene_accuracy_rating?: string;
  product_accuracy_rating?: string;
  unrated?: string;
  from?: string;
  to?: string;
  sort?: string;
  order?: string;
};

function buildQuery(params: FilterParams): string {
  const sp = new URLSearchParams();
  const keys: (keyof FilterParams)[] = [
    'prompt_version_id', 'scene_accuracy_rating', 'product_accuracy_rating',
    'unrated', 'from', 'to', 'sort', 'order',
  ];
  for (const k of keys) {
    const v = params[k];
    if (v !== undefined && v !== '') sp.set(k, v);
  }
  return sp.toString();
}

export function buildGenerationsQuery(params: FilterParams): string {
  const q = buildQuery(params);
  return `/generations${q ? `?${q}` : ''}`;
}

export function GenerationsFilters({
  params,
  promptVersions,
}: {
  params: FilterParams;
  promptVersions: PromptVersionListItem[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const base = (overrides: Partial<FilterParams>) => buildGenerationsQuery({ ...params, ...overrides });

  const handleDateApply = useCallback(
    (from: string, to: string) => {
      const next = new URLSearchParams(searchParams.toString());
      if (from) next.set('from', from);
      else next.delete('from');
      if (to) next.set('to', to);
      else next.delete('to');
      router.push(`/generations?${next}`);
    },
    [router, searchParams],
  );

  const hasAny =
    params.scene_accuracy_rating ||
    params.product_accuracy_rating ||
    params.unrated ||
    params.prompt_version_id ||
    params.from ||
    params.to;

  return (
    <div className="mt-6 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-gray-500 mr-1">Scene:</span>
        {['GOOD', 'FAILED'].map((r) => (
          <Link
            key={`scene-${r}`}
            href={base({ scene_accuracy_rating: params.scene_accuracy_rating === r ? undefined : r })}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              params.scene_accuracy_rating === r ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {r}
          </Link>
        ))}
        <span className="text-xs text-gray-500 ml-2 mr-1">Product:</span>
        {['GOOD', 'FAILED'].map((r) => (
          <Link
            key={`product-${r}`}
            href={base({ product_accuracy_rating: params.product_accuracy_rating === r ? undefined : r })}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              params.product_accuracy_rating === r ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {r}
          </Link>
        ))}
        <Link
          href={base({ unrated: params.unrated === 'true' ? undefined : 'true' })}
          className={`ml-2 rounded-full px-3 py-1 text-xs font-medium ${
            params.unrated === 'true' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Unrated
        </Link>
        <span className="text-xs text-gray-500 ml-2 mr-1">Prompt:</span>
        <select
          value={params.prompt_version_id ?? ''}
          onChange={(e) => {
            const id = e.target.value || undefined;
            router.push(buildGenerationsQuery({ ...params, prompt_version_id: id }));
          }}
          className="rounded-lg border border-gray-300 px-2 py-1 text-xs focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
        >
          <option value="">All prompts</option>
          {promptVersions.map((pv) => (
            <option key={pv.id} value={pv.id}>
              {pv.name ?? 'Untitled'}
            </option>
          ))}
        </select>
        {hasAny && (
          <Link href="/generations" className="rounded-full px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50">
            Clear Filters
          </Link>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-gray-500">Date range:</span>
        <DateRangeForm from={params.from} to={params.to} onApply={handleDateApply} />
      </div>
    </div>
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
      className="flex items-center gap-2"
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
        className="rounded border border-gray-300 px-2 py-1 text-xs focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
      />
      <span className="text-xs text-gray-400">to</span>
      <input
        type="date"
        name="to"
        defaultValue={to}
        className="rounded border border-gray-300 px-2 py-1 text-xs focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
      />
      <button
        type="submit"
        className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200"
      >
        Apply
      </button>
    </form>
  );
}
