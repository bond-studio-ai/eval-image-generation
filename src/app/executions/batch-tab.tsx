'use client';

import { GridLightbox } from '@/components/grid-lightbox';
import { MatrixCellRatingOverlay } from '@/components/matrix-cell-rating-overlay';
import { ExecutionsRunButton } from '@/app/executions/executions-run-button';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

interface RunRow {
  id: string;
  strategyId: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
  inputPresetName: string | null;
  lastOutputUrl: string | null;
  lastOutputGenerationId: string | null;
  stepResults: { id: string; status: string }[];
}

interface BatchRow {
  id: string;
  strategyId: string | null;
  strategyName: string | null;
  executionCount: number;
  createdAt: string;
  status: string;
  totalRuns: number;
  completedRuns: number;
  failedRuns: number;
  runs: RunRow[];
}

const POLL_INTERVAL = 5000;

export function BatchRunsTab() {
  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'matrix'>('list');
  const [retryingRunId, setRetryingRunId] = useState<string | null>(null);
  const [markingBatchId, setMarkingBatchId] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ src: string; runHref: string; generationId: string | null } | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchBatches = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/strategy-batch-runs', { cache: 'no-store' });
      if (!res.ok) return;
      const json = await res.json();
      setBatches(json.data ?? []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchBatches(); }, [fetchBatches]);

  const hasActive = batches.some((b) => b.status === 'running' || b.status === 'pending');
  useEffect(() => {
    if (hasActive) {
      intervalRef.current = setInterval(fetchBatches, POLL_INTERVAL);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [hasActive, fetchBatches]);

  const handleRetry = useCallback(async (runId: string) => {
    setRetryingRunId(runId);
    try {
      const res = await fetch(`/api/v1/strategy-runs/${runId}/retry`, { method: 'POST' });
      if (!res.ok) return;
      await fetchBatches();
    } catch { /* ignore */ }
    finally { setRetryingRunId(null); }
  }, [fetchBatches]);

  const handleMarkBatchFailed = useCallback(async (batchId: string) => {
    setMarkingBatchId(batchId);
    try {
      const res = await fetch(`/api/v1/strategy-batch-runs/${batchId}/mark-failed`, { method: 'POST' });
      if (!res.ok) return;
      await fetchBatches();
    } catch { /* ignore */ }
    finally { setMarkingBatchId(null); }
  }, [fetchBatches]);

  if (loading) return <p className="text-sm text-gray-500">Loading batch runs…</p>;

  if (batches.length === 0) {
    return <p className="text-sm text-gray-600">No batch runs yet. Use &ldquo;Run&rdquo; above or &ldquo;Run Batch&rdquo; on a strategy to create one.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <ExecutionsRunButton onRunCreated={fetchBatches} />
        <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${viewMode === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
          >
            List
          </button>
          <button
            type="button"
            onClick={() => setViewMode('matrix')}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${viewMode === 'matrix' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Matrix
          </button>
        </div>
      </div>

      {viewMode === 'matrix' ? (
        <>
          {batches.map((batch) => {
            const presetNames = new Set(batch.runs.map((r) => r.inputPresetName ?? '(no preset)'));
            return (
              <div key={batch.id} className="rounded-lg border border-gray-200 bg-white shadow-xs">
                <div className="flex w-full items-center justify-between border-b border-gray-100 px-5 py-3">
                  <div className="flex items-center gap-3">
                    <StatusBadge status={batch.status} />
                    {batch.strategyId != null ? (
                      <Link
                        href={`/strategies/${batch.strategyId}`}
                        className="text-primary-600 hover:text-primary-500 text-sm font-semibold"
                      >
                        {batch.strategyName ?? 'Unknown strategy'}
                      </Link>
                    ) : (
                      <span className="text-sm font-semibold text-gray-900">{batch.strategyName ?? 'Multiple strategies'}</span>
                    )}
                    <span className="text-sm text-gray-600">
                      {batch.totalRuns} run{batch.totalRuns === 1 ? '' : 's'} · {presetNames.size} preset{presetNames.size === 1 ? '' : 's'}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(batch.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="border-t border-gray-100 p-4">
                  <BatchMatrix
                    runs={batch.runs}
                    strategyId={batch.strategyId}
                    retryingRunId={retryingRunId}
                    onRetry={handleRetry}
                    onRated={fetchBatches}
                    onImageClick={(run) => setLightbox({ src: run.lastOutputUrl!, runHref: `/strategies/${run.strategyId}/runs/${run.id}`, generationId: run.lastOutputGenerationId ?? null })}
                  />
                </div>
              </div>
            );
          })}
        </>
      ) : (
      <>
      {batches.map((batch) => {
        const isExpanded = expandedId === batch.id;
        const presetNames = new Set(batch.runs.map((r) => r.inputPresetName ?? '(no preset)'));

        return (
          <div key={batch.id} className="rounded-lg border border-gray-200 bg-white shadow-xs">
            {/* Header row: left = expand, right = actions */}
            <div className="flex w-full items-center justify-between px-5 py-3">
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : batch.id)}
                className="flex flex-1 items-center gap-3 text-left hover:bg-gray-50 rounded -ml-2 -my-1 px-2 py-1"
              >
                <svg
                  className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                  fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
                <StatusBadge status={batch.status} />
                {batch.strategyId != null ? (
                  <Link
                    href={`/strategies/${batch.strategyId}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-primary-600 hover:text-primary-500 text-sm font-semibold"
                  >
                    {batch.strategyName ?? 'Unknown strategy'}
                  </Link>
                ) : (
                  <span className="text-sm font-semibold text-gray-900">{batch.strategyName ?? 'Multiple strategies'}</span>
                )}
                <span className="text-sm text-gray-600">
                  {batch.totalRuns} run{batch.totalRuns === 1 ? '' : 's'} &middot;{' '}
                  {presetNames.size} preset{presetNames.size === 1 ? '' : 's'}
                </span>
                <span className="text-xs text-gray-400">
                  {batch.completedRuns} completed{batch.failedRuns > 0 ? `, ${batch.failedRuns} failed` : ''}
                </span>
              </button>
              <div className="flex shrink-0 items-center gap-2">
                {batch.status !== 'failed' && (
                  <button
                    type="button"
                    onClick={() => handleMarkBatchFailed(batch.id)}
                    disabled={markingBatchId === batch.id}
                    className="rounded border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                  >
                    {markingBatchId === batch.id ? '…' : 'Mark batch as failed'}
                  </button>
                )}
                <span className="text-xs text-gray-400">
                  {new Date(batch.createdAt).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Expanded: matrix */}
            {isExpanded && (
              <div className="border-t border-gray-100 p-4">
                <BatchMatrix
                  runs={batch.runs}
                  strategyId={batch.strategyId}
                  retryingRunId={retryingRunId}
                  onRetry={handleRetry}
                  onRated={fetchBatches}
                  onImageClick={(run) => setLightbox({ src: run.lastOutputUrl!, runHref: `/strategies/${batch.strategyId}/runs/${run.id}`, generationId: run.lastOutputGenerationId ?? null })}
                />
              </div>
            )}
          </div>
        );
      })}
      </>
      )}
      {lightbox && (
        <GridLightbox
          src={lightbox.src}
          runHref={lightbox.runHref}
          generationId={lightbox.generationId}
          onRated={() => fetchBatches()}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  );
}

/* ─── Batch Matrix ─── */

function BatchMatrix({
  runs,
  strategyId: _strategyId,
  retryingRunId,
  onRetry,
  onRated,
  onImageClick,
}: {
  runs: RunRow[];
  strategyId: string | null;
  retryingRunId: string | null;
  onRetry: (runId: string) => void;
  onRated?: () => void;
  onImageClick: (run: RunRow) => void;
}) {
  const byPreset = new Map<string, RunRow[]>();
  for (const run of runs) {
    const key = run.inputPresetName ?? '(no preset)';
    if (!byPreset.has(key)) byPreset.set(key, []);
    byPreset.get(key)!.push(run);
  }
  for (const arr of byPreset.values()) {
    arr.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }
  const presetNames = Array.from(byPreset.keys()).sort();
  const maxExecutions = Math.max(0, ...Array.from(byPreset.values()).map((a) => a.length));

  const CELL = 240;

  return (
    <div className="overflow-x-auto overflow-y-hidden rounded-lg border border-gray-200">
      <table className="divide-y divide-gray-200" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
        <thead className="bg-gray-50">
          <tr>
            <th
              className="sticky left-0 z-10 border-r border-gray-200 bg-gray-50 px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-600"
              style={{ minWidth: 200, maxWidth: 200 }}
            >
              Input preset
            </th>
            {Array.from({ length: maxExecutions }, (_, i) => (
              <th key={i} className="px-2 py-2.5 text-center text-xs font-medium uppercase tracking-wider text-gray-600"
                style={{ width: CELL, minWidth: CELL }}>
                #{i + 1}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {presetNames.map((presetName) => {
            const presetRuns = byPreset.get(presetName)!;
            return (
              <tr key={presetName} className="hover:bg-gray-50/50">
                <td className="sticky left-0 z-10 border-r border-gray-200 bg-white px-4 text-sm font-medium text-gray-900"
                  style={{ minWidth: 200, maxWidth: 200 }}>
                  <span className="block break-words">{presetName}</span>
                </td>
                {Array.from({ length: maxExecutions }, (_, i) => {
                  const run = presetRuns[i];
                  return (
                    <td key={i} className="border-l border-gray-100 p-1.5 text-center align-middle"
                      style={{ width: CELL, height: CELL, minWidth: CELL }}>
                      <div className="flex h-full w-full flex-col items-center justify-center gap-1">
                        {!run ? (
                          <span className="text-gray-200">&mdash;</span>
                        ) : run.lastOutputUrl ? (
                          <button
                            type="button"
                            onClick={() => onImageClick(run)}
                            className="group relative block"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={run.lastOutputUrl} alt=""
                              className="rounded-lg border border-gray-200 object-cover shadow-sm transition-shadow hover:shadow-md"
                              style={{ width: CELL - 20, height: CELL - 20 }} />
                            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/0 transition-colors group-hover:bg-black/20">
                              <svg className="h-8 w-8 text-white opacity-0 drop-shadow transition-opacity group-hover:opacity-100" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                              </svg>
                            </div>
                            {run.lastOutputGenerationId && (
                              <MatrixCellRatingOverlay generationId={run.lastOutputGenerationId} onRated={onRated} />
                            )}
                          </button>
                        ) : (
                          <>
                            <Link href={`/strategies/${run.strategyId}/runs/${run.id}`}>
                              <StatusBadge status={run.status} />
                            </Link>
                            {run.status === 'failed' && (
                              <button type="button" onClick={() => onRetry(run.id)}
                                disabled={retryingRunId === run.id}
                                className="text-xs font-medium text-amber-600 hover:text-amber-500 disabled:opacity-50">
                                {retryingRunId === run.id ? 'Retrying…' : 'Retry'}
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
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
