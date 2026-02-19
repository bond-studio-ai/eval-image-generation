'use client';

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
  stepResults: StepResult[];
}

const POLL_INTERVAL = 3000;

export function StrategyRunsList({ strategyId, initialRuns }: { strategyId: string; initialRuns: Run[] }) {
  const [runs, setRuns] = useState<Run[]>(initialRuns);
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

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Runs</h2>
        <StrategyRunButton strategyId={strategyId} onRunCreated={handleRunCreated} />
      </div>

      {runs.length === 0 ? (
        <p className="mt-4 text-sm text-gray-600">No runs yet. Click &ldquo;Run Strategy&rdquo; to execute.</p>
      ) : (
        <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xs">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600">Status</th>
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
                      <Link
                        href={`/strategies/${strategyId}/runs/${run.id}`}
                        className="text-primary-600 hover:text-primary-500 font-medium"
                      >
                        View
                      </Link>
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
