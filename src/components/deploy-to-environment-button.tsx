'use client';

import { serviceUrl } from '@/lib/api-base';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

type EnvironmentItem = {
  id: string;
  name: string;
  apiHostname: string;
  isActive: boolean;
  hasAuthToken: boolean;
};

export function DeployToEnvironmentButton({
  strategyId,
  label = 'Deploy',
  variant = 'secondary',
}: {
  strategyId: string;
  label?: string;
  variant?: 'secondary' | 'icon';
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [selectedId, setSelectedId] = useState<string>('');
  const [environments, setEnvironments] = useState<EnvironmentItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setSelectedId('');
    setError(null);
    setResult(null);
    fetch(serviceUrl('environments?limit=100'), { cache: 'no-store' })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            (json as { error?: { message?: string } }).error?.message ?? 'Failed to load environments.',
          );
        }
        return json;
      })
      .then((json) => {
        if (cancelled) return;
        const items = Array.isArray(json.data) ? (json.data as EnvironmentItem[]) : [];
        setEnvironments(items);
        const firstEligible = items.find((item) => item.isActive && item.hasAuthToken);
        setSelectedId(firstEligible?.id ?? '');
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setEnvironments([]);
          setError(err instanceof Error ? err.message : 'Failed to load environments.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleDeploy = useCallback(async () => {
    if (!selectedId) return;
    setDeploying(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(serviceUrl(`environments/${selectedId}/deploy`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity: 'strategy',
          mode: 'upsert',
          data: { id: strategyId },
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((json as { error?: { message?: string } }).error?.message ?? 'Deploy failed.');
        return;
      }
      const deployResult = (json as { data?: { result?: string; environment?: { name?: string } } }).data;
      setResult(
        `${deployResult?.result === 'updated' ? 'Updated' : 'Created'} in ${
          deployResult?.environment?.name ?? 'environment'
        }.`,
      );
      router.refresh();
    } catch {
      setError('Deploy failed.');
    } finally {
      setDeploying(false);
    }
  }, [router, selectedId, strategyId]);

  return (
    <>
      {variant === 'icon' ? (
        <div className="group/action relative">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"
              />
            </svg>
          </button>
          <span className="pointer-events-none absolute -top-8 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover/action:opacity-100">
            {label}
          </span>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"
            />
          </svg>
          {label}
        </button>
      )}

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4"
            onClick={() => setOpen(false)}
          >
            <div
              className="w-full max-w-lg rounded-lg border border-gray-200 bg-white shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="border-b border-gray-200 px-5 py-4">
                <h3 className="text-lg font-semibold text-gray-900">Deploy Strategy</h3>
                <p className="mt-1 text-sm text-gray-600">Choose an environment to deploy this strategy to.</p>
              </div>

              <div className="space-y-3 px-5 py-4">
                {loading ? (
                  <p className="text-sm text-gray-500">Loading environments...</p>
                ) : environments.length === 0 ? (
                  <p className="text-sm text-gray-500">No environments available.</p>
                ) : (
                  <div className="space-y-2">
                    {environments.map((environment) => {
                      const disabled = !environment.isActive || !environment.hasAuthToken;
                      return (
                        <label
                          key={environment.id}
                          className={`flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 ${
                            selectedId === environment.id
                              ? 'border-primary-400 bg-primary-50'
                              : 'border-gray-200 bg-white'
                          } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
                        >
                          <input
                            type="radio"
                            name="environmentId"
                            value={environment.id}
                            checked={selectedId === environment.id}
                            disabled={disabled}
                            onChange={() => setSelectedId(environment.id)}
                            className="mt-0.5 h-4 w-4"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900">{environment.name}</p>
                            <p className="text-xs text-gray-500">{environment.apiHostname}</p>
                            <p className="mt-1 text-xs text-gray-500">
                              {!environment.isActive
                                ? 'Inactive'
                                : !environment.hasAuthToken
                                  ? 'Missing auth token'
                                  : 'Ready to deploy'}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}

                {error && <p className="text-sm text-red-600">{error}</p>}
                {result && <p className="text-sm text-green-600">{result}</p>}
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-5 py-3">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleDeploy}
                  disabled={deploying || !selectedId}
                  className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-primary-400"
                >
                  {deploying ? 'Deploying...' : 'Deploy'}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
