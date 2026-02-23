'use client';

import { GridLightbox } from '@/components/grid-lightbox';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

interface RunRow {
  id: string;
  strategyId: string;
  strategyName: string | null;
  status: string;
  createdAt: string;
  inputPresetName: string | null;
  lastOutputUrl: string | null;
  lastOutputGenerationId: string | null;
}

const POLL_INTERVAL = 5000;
const THUMB_SIZE = 72;

export function IndividualExecutionsTab() {
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [lightbox, setLightbox] = useState<{ src: string; runHref: string; generationId: string | null } | null>(null);

  const fetchRuns = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/strategy-runs?limit=500', { cache: 'no-store' });
      if (!res.ok) return;
      const json = await res.json();
      setRuns(json.data ?? []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchRuns(); }, [fetchRuns]);

  const hasActive = runs.some((r) => r.status === 'running' || r.status === 'pending');
  useEffect(() => {
    if (hasActive) {
      intervalRef.current = setInterval(fetchRuns, POLL_INTERVAL);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [hasActive, fetchRuns]);

  if (loading) {
    return <p className="text-sm text-gray-500">Loading executions…</p>;
  }

  if (runs.length === 0) {
    return <p className="text-sm text-gray-600">No individual runs yet. Run a strategy from its detail page.</p>;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xs">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600">
                Last output
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600">
                Strategy
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600">
                Input preset
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600">
                Created
              </th>
              <th className="relative w-10 px-4 py-3"><span className="sr-only">View</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {runs.map((run) => (
              <tr key={run.id} className="hover:bg-gray-50/60">
                <td className="whitespace-nowrap px-4 py-2">
                  {run.lastOutputUrl ? (
                    <button
                      type="button"
                      onClick={() => setLightbox({
                        src: run.lastOutputUrl!,
                        runHref: `/strategies/${run.strategyId}/runs/${run.id}`,
                        generationId: run.lastOutputGenerationId ?? null,
                      })}
                      className="block"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={run.lastOutputUrl}
                        alt=""
                        width={THUMB_SIZE}
                        height={THUMB_SIZE}
                        className="rounded border border-gray-200 object-cover"
                      />
                    </button>
                  ) : (
                    <span className="inline-flex h-[72px] w-[72px] items-center justify-center rounded border border-gray-200 bg-gray-50 text-xs text-gray-400">
                      —
                    </span>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-2">
                  <Link
                    href={`/strategies/${run.strategyId}`}
                    className="text-sm font-medium text-primary-600 hover:text-primary-500"
                  >
                    {run.strategyName ?? 'Unknown'}
                  </Link>
                </td>
                <td className="max-w-[200px] truncate px-4 py-2 text-sm text-gray-700" title={run.inputPresetName ?? undefined}>
                  {run.inputPresetName ?? '—'}
                </td>
                <td className="whitespace-nowrap px-4 py-2">
                  <StatusBadge status={run.status} />
                </td>
                <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-500">
                  {new Date(run.createdAt).toLocaleString()}
                </td>
                <td className="whitespace-nowrap px-4 py-2">
                  <Link
                    href={`/strategies/${run.strategyId}/runs/${run.id}`}
                    className="text-sm font-medium text-primary-600 hover:text-primary-500"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {lightbox && (
        <GridLightbox
          src={lightbox.src}
          runHref={lightbox.runHref}
          generationId={lightbox.generationId}
          onRated={() => fetchRuns()}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
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
