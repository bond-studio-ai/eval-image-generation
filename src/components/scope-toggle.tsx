'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

export function ScopeToggle({
  benchmarkLabel = 'Benchmark',
  defaultLabel = 'Standard',
}: {
  benchmarkLabel?: string;
  defaultLabel?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const source = searchParams.get('source') === 'benchmark' ? 'benchmark' : 'default';

  const setScope = useCallback(
    (nextScope: 'default' | 'benchmark') => {
      const next = new URLSearchParams(searchParams.toString());
      if (nextScope === 'benchmark') next.set('source', 'benchmark');
      else next.delete('source');
      router.push(`${pathname}${next.toString() ? `?${next}` : ''}`);
    },
    [pathname, router, searchParams],
  );

  return (
    <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 p-0.5">
      <button
        type="button"
        onClick={() => setScope('default')}
        className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
          source === 'default' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        {defaultLabel}
      </button>
      <button
        type="button"
        onClick={() => setScope('benchmark')}
        className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
          source === 'benchmark' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        {benchmarkLabel}
      </button>
    </div>
  );
}
