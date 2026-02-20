'use client';

import type { InputPresetListItem } from '@/lib/queries';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StrategyRunButton } from './run-button';

interface StepResult {
  id: string;
  status: string;
}

interface Run {
  id: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
  inputPresetName: string | null;
  stepResults: StepResult[];
}

const POLL_INTERVAL = 3000;

export function StrategyRunsList({
  strategyId,
  initialRuns,
  inputPresets,
}: {
  strategyId: string;
  initialRuns: Run[];
  inputPresets: InputPresetListItem[];
}) {
  const [runs, setRuns] = useState<Run[]>(initialRuns);
  const [retryingRunId, setRetryingRunId] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const hasActiveRun = runs.some((r) => r.status === 'running' || r.status === 'pending');

  const fetchRuns = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/strategies/${strategyId}/runs`, { cache: 'no-store' });
      if (!res.ok) return;
      const json = await res.json();
      setRuns(json.data ?? []);
    } catch { /* ignore */ }
  }, [strategyId]);

  useEffect(() => {
    if (hasActiveRun) {
      intervalRef.current = setInterval(fetchRuns, POLL_INTERVAL);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [hasActiveRun, fetchRuns]);

  const handleRunCreated = useCallback(() => {
    fetchRuns();
  }, [fetchRuns]);

  const handleRetry = useCallback(async (runId: string) => {
    setRetryingRunId(runId);
    try {
      const res = await fetch(`/api/v1/strategy-runs/${runId}/retry`, { method: 'POST' });
      if (!res.ok) return;
      await fetchRuns();
    } catch { /* ignore */ }
    finally { setRetryingRunId(null); }
  }, [fetchRuns]);

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Runs</h2>
        <StrategyRunButton strategyId={strategyId} inputPresets={inputPresets} onRunCreated={handleRunCreated} />
      </div>

      {runs.length === 0 ? (
        <p className="mt-4 text-sm text-gray-600">No runs yet. Click &ldquo;Run Strategy&rdquo; to execute.</p>
      ) : (
        <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xs">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600">Input Preset</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600">Steps</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600">Started</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600">Completed</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {runs.map((run) => {
                const completed = run.stepResults.filter((sr) => sr.status === 'completed').length;
                const total = run.stepResults.length;
                return (
                  <tr key={run.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4">
                      <StatusBadge status={run.status} />
                    </td>
                    <td className="max-w-[200px] truncate whitespace-nowrap px-6 py-4 text-sm text-gray-700">
                      {run.inputPresetName || <span className="text-gray-400">-</span>}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">
                      {completed}/{total}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {new Date(run.createdAt).toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {run.completedAt ? new Date(run.completedAt).toLocaleString() : '-'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                      <div className="flex items-center justify-end gap-3">
                        {run.status === 'failed' && (
                          <button
                            type="button"
                            onClick={() => handleRetry(run.id)}
                            disabled={retryingRunId === run.id}
                            className="inline-flex items-center gap-1 font-medium text-amber-600 hover:text-amber-500 disabled:opacity-50"
                          >
                            {retryingRunId === run.id ? (
                              <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                            ) : (
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                              </svg>
                            )}
                            Retry
                          </button>
                        )}
                        <Link
                          href={`/strategies/${strategyId}/runs/${run.id}`}
                          className="text-primary-600 hover:text-primary-500 font-medium"
                        >
                          View
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-700',
    running: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status] ?? styles.pending}`}>
      {status}
    </span>
  );
}
