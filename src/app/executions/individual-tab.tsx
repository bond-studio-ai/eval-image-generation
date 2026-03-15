'use client';

import { GridLightbox } from '@/components/grid-lightbox';
import { serviceUrl } from '@/lib/api-base';
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
  totalGenerations?: number;
  ratedGenerations?: number;
}

function deriveRunReviewStatus(run: RunRow): string {
  if (run.status === 'running' || run.status === 'pending') return 'running';
  const total = run.totalGenerations ?? 0;
  const rated = run.ratedGenerations ?? 0;
  if (total === 0) return 'pending';
  if (rated === 0) return 'pending';
  if (rated >= total) return 'reviewed';
  return 'in_progress';
}

const POLL_INTERVAL = 5000;
const PAGE_SIZE = 50;
const THUMB_SIZE = 72;

export function IndividualExecutionsTab() {
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sentinelRef = useRef<HTMLTableRowElement | null>(null);
  const [lightbox, setLightbox] = useState<{ src: string; runHref: string; generationId: string | null } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= 2) {
          const first = next.values().next().value!;
          next.delete(first);
        }
        next.add(id);
      }
      return next;
    });
  };

  const selectedArr = [...selected];

  const hasMore = runs.length < total;

  const fetchRuns = useCallback(async (opts: { replace?: boolean; pageToFetch?: number; limit?: number } = {}) => {
    const replace = opts.replace ?? false;
    const pageToFetch = opts.pageToFetch ?? 1;
    const limit = opts.limit ?? (replace && runs.length > 0 ? Math.max(PAGE_SIZE, runs.length) : PAGE_SIZE);
    if (replace) setFetchError(null);
    else setLoadingMore(true);
    try {
      const params = new URLSearchParams({ page: String(pageToFetch), limit: String(limit) });
      const res = await fetch(serviceUrl(`strategy-runs?${params}`), { cache: 'no-store' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = (err as { error?: { message?: string } })?.error?.message;
        setFetchError(msg || `Failed to load (${res.status}). Check that the backend is reachable.`);
        return;
      }
      const json = await res.json();
      const data = (json.data ?? []) as RunRow[];
      const paginationTotal = Number(json.pagination?.total ?? 0);
      if (replace) {
        setRuns(data);
        setTotal(paginationTotal);
        setPage(1);
      } else {
        setRuns((prev) => [...prev, ...data]);
        setTotal(paginationTotal);
        setPage(pageToFetch);
      }
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : 'Network error. Check backend and try again.');
    }
    finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [runs.length]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    fetchRuns({ replace: false, pageToFetch: page + 1, limit: PAGE_SIZE });
  }, [hasMore, loadingMore, page, fetchRuns]);

  useEffect(() => {
    fetchRuns({ replace: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore || loadingMore) return;
    const obs = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting) loadMore(); },
      { rootMargin: '200px', threshold: 0 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, loadingMore, loadMore]);

  const hasActive = runs.some((r) => r.status === 'running' || r.status === 'pending');
  const refreshRuns = useCallback(() => {
    fetchRuns({ replace: true, limit: runs.length || PAGE_SIZE });
  }, [fetchRuns, runs.length]);
  useEffect(() => {
    if (hasActive) {
      intervalRef.current = setInterval(refreshRuns, POLL_INTERVAL);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [hasActive, refreshRuns]);

  if (loading) {
    return <p className="text-sm text-gray-500">Loading executions…</p>;
  }

  if (fetchError) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm text-amber-800">{fetchError}</p>
        <p className="mt-1 text-xs text-amber-700">Ensure BASE_API_HOSTNAME points to the image-generation backend.</p>
        <button
          type="button"
          onClick={() => { setLoading(true); fetchRuns(); }}
          className="mt-3 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium text-amber-800 shadow-sm hover:bg-amber-100"
        >
          Retry
        </button>
      </div>
    );
  }

  if (runs.length === 0) {
    return <p className="text-sm text-gray-600">No individual runs yet. Run a strategy from its detail page.</p>;
  }

  return (
    <div className="space-y-2">
      {selectedArr.length > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-primary-200 bg-primary-50 px-4 py-2">
          <span className="text-sm text-primary-700">
            {selectedArr.length === 1 ? '1 run selected — select one more to compare' : '2 runs selected'}
          </span>
          {selectedArr.length === 2 && (
            <Link
              href={`/audit/compare?left=${selectedArr[0]}&right=${selectedArr[1]}`}
              className="rounded-md bg-primary-600 px-3 py-1 text-xs font-medium text-white hover:bg-primary-500"
            >
              Compare
            </Link>
          )}
          <button type="button" onClick={() => setSelected(new Set())} className="ml-auto text-xs text-primary-600 hover:text-primary-500">
            Clear
          </button>
        </div>
      )}
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xs">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-10 px-3 py-3">
                <span className="sr-only">Select</span>
              </th>
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
              <tr key={run.id} className={`hover:bg-gray-50/60 ${selected.has(run.id) ? 'bg-primary-50/50' : ''}`}>
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selected.has(run.id)}
                    onChange={() => toggleSelected(run.id)}
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                </td>
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
                  <StatusBadge status={deriveRunReviewStatus(run)} />
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
            {hasMore && (
              <tr ref={sentinelRef} className="bg-gray-50/50">
                <td colSpan={7} className="px-4 py-3 text-center text-sm text-gray-500">
                  {loadingMore ? 'Loading more…' : '\u00a0'}
                </td>
              </tr>
            )}
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
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { style: string; label: string }> = {
    running: { style: 'bg-blue-100 text-blue-700', label: 'Running' },
    pending: { style: 'bg-gray-100 text-gray-700', label: 'Pending' },
    in_progress: { style: 'bg-amber-100 text-amber-700', label: 'In Progress' },
    reviewed: { style: 'bg-green-100 text-green-700', label: 'Reviewed' },
  };
  const c = config[status] ?? config.pending;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${c.style}`}>
      {c.label}
    </span>
  );
}
