'use client';

import { DeployToEnvironmentButton } from '@/components/deploy-to-environment-button';
import { serviceUrl } from '@/lib/api-base';
import type { StrategyListItem } from '@/lib/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

export function StrategiesTable({ strategies }: { strategies: StrategyListItem[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const handleDelete = useCallback(
    async (id: string, name: string) => {
      if (!confirm(`Delete strategy "${name}"? This will soft-delete the strategy.`)) return;
      setDeletingId(id);
      try {
        const res = await fetch(serviceUrl(`strategies/${id}`), { method: 'DELETE' });
        if (!res.ok) return;
        router.refresh();
      } catch {
        // ignore
      } finally {
        setDeletingId(null);
      }
    },
    [router],
  );

  const handleToggleActive = useCallback(
    async (id: string, currentlyActive: boolean) => {
      setTogglingId(id);
      try {
        const action = currentlyActive ? 'deactivate' : 'activate';
        const res = await fetch(serviceUrl(`strategies/${id}/${action}`), { method: 'POST' });
        if (!res.ok) return;
        router.refresh();
      } catch {
        // ignore
      } finally {
        setTogglingId(null);
      }
    },
    [router],
  );

  return (
    <div className="mt-8 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xs">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600">Name</th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600">Steps</th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600">Runs</th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600">Created</th>
            <th className="relative w-32 px-6 py-3">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {strategies.map((s) => (
            <tr key={s.id} className="hover:bg-gray-50">
              <td className="px-6 py-4">
                <Link href={`/strategies/${s.id}`} className="text-sm font-medium text-primary-600 hover:text-primary-500">
                  {s.name}
                </Link>
                {s.description && (
                  <p className="mt-0.5 text-xs text-gray-500 line-clamp-1">{s.description}</p>
                )}
              </td>
              <td className="whitespace-nowrap px-6 py-4">
                <button
                  type="button"
                  onClick={() => handleToggleActive(s.id, s.isActive)}
                  disabled={togglingId === s.id}
                  className="group flex items-center gap-1.5 disabled:opacity-50"
                  title={s.isActive ? 'Deactivate strategy' : 'Activate strategy'}
                >
                  {s.isActive ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 ring-1 ring-green-600/20 ring-inset">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-600" />
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-2.5 py-0.5 text-xs font-medium text-gray-500 ring-1 ring-gray-300 ring-inset opacity-60 group-hover:opacity-100 transition-opacity">
                      Inactive
                    </span>
                  )}
                </button>
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">
                {s.stepCount} step{s.stepCount !== 1 ? 's' : ''}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">
                {s.runCount} run{s.runCount !== 1 ? 's' : ''}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                {new Date(s.createdAt).toLocaleDateString()}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-right">
                <div className="flex justify-end gap-1">
                  <DeployToEnvironmentButton strategyId={s.id} variant="icon" />
                  <button
                    type="button"
                    onClick={() => handleDelete(s.id, s.name)}
                    disabled={deletingId === s.id}
                    className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                    title="Delete strategy"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
