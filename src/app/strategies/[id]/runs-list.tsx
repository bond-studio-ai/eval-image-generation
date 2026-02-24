'use client';

import { GridLightbox } from '@/components/grid-lightbox';
import { MatrixCellRatingOverlay } from '@/components/matrix-cell-rating-overlay';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

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
  lastOutputUrl?: string | null;
  lastOutputGenerationId?: string | null;
  batchRunId?: string | null;
  stepResults: StepResult[];
}

type ListItem = { kind: 'batch'; id: string; runs: Run[]; status: string; createdAt: string };

const POLL_INTERVAL = 3000;

export function StrategyRunsList({
  strategyId,
  initialRuns,
}: {
  strategyId: string;
  initialRuns: Run[];
}) {
  const [runs, setRuns] = useState<Run[]>(initialRuns);
  const [retryingRunId, setRetryingRunId] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ src: string; runHref: string; generationId: string | null } | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'matrix'>('list');
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

  const handleRetry = useCallback(async (runId: string) => {
    setRetryingRunId(runId);
    try {
      const res = await fetch(`/api/v1/strategy-runs/${runId}/retry`, { method: 'POST' });
      if (!res.ok) return;
      await fetchRuns();
    } catch { /* ignore */ }
    finally { setRetryingRunId(null); }
  }, [fetchRuns]);

  const [markingBatchId, setMarkingBatchId] = useState<string | null>(null);
  const handleMarkBatchFailed = useCallback(async (batchId: string) => {
    setMarkingBatchId(batchId);
    try {
      const res = await fetch(`/api/v1/strategy-batch-runs/${batchId}/mark-failed`, { method: 'POST' });
      if (!res.ok) return;
      await fetchRuns();
    } catch { /* ignore */ }
    finally { setMarkingBatchId(null); }
  }, [fetchRuns]);

  // Only batch runs count: build list of batch cards (omit individual runs)
  const items: ListItem[] = [];
  const batchMap = new Map<string, Run[]>();

  for (const run of runs) {
    if (run.batchRunId) {
      if (!batchMap.has(run.batchRunId)) batchMap.set(run.batchRunId, []);
      batchMap.get(run.batchRunId)!.push(run);
    }
  }

  for (const [batchId, batchRuns] of batchMap) {
    const sorted = [...batchRuns].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const allStatuses = sorted.map((r) => r.status);
    const status = allStatuses.every((s) => s === 'completed')
      ? 'completed'
      : allStatuses.some((s) => s === 'running' || s === 'pending')
        ? 'running'
        : allStatuses.some((s) => s === 'failed')
          ? 'failed'
          : 'pending';
    items.push({ kind: 'batch', id: batchId, runs: sorted, status, createdAt: sorted[0]?.createdAt ?? '' });
  }

  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Runs</h2>
        <div className="flex items-center gap-2">
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
      </div>

      {items.length === 0 ? (
        <p className="mt-4 text-sm text-gray-600">No runs yet. Click &ldquo;Run Batch&rdquo; to execute.</p>
      ) : viewMode === 'list' ? (
        <div className="mt-4 space-y-4">
          {items.map((item) => (
            <BatchRunCard
              key={`batch-${item.id}`}
              batch={item}
              strategyId={strategyId}
              retryingRunId={retryingRunId}
              onRetry={handleRetry}
              onRated={fetchRuns}
              onMarkBatchFailed={handleMarkBatchFailed}
              markingBatchId={markingBatchId}
              onImageClick={(run) => setLightbox({ src: run.lastOutputUrl!, runHref: `/strategies/${strategyId}/runs/${run.id}`, generationId: run.lastOutputGenerationId ?? null })}
            />
          ))}
        </div>
      ) : (
        <div className="mt-4 space-y-6">
          {items.map((item) => (
            <div key={`batch-matrix-${item.id}`} className="rounded-lg border border-gray-200 bg-white shadow-xs">
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2">
                <span className="text-sm font-medium text-gray-700">
                  Batch · {new Date(item.createdAt).toLocaleString()}
                </span>
                <StatusBadge status={item.status} />
              </div>
              <div className="p-4">
                <BatchMatrix
                  runs={item.runs}
                  strategyId={strategyId}
                  retryingRunId={retryingRunId}
                  onRetry={handleRetry}
                  onRated={fetchRuns}
                  onImageClick={(run) => setLightbox({ src: run.lastOutputUrl!, runHref: `/strategies/${strategyId}/runs/${run.id}`, generationId: run.lastOutputGenerationId ?? null })}
                />
              </div>
            </div>
          ))}
        </div>
      )}
      {lightbox && (
        <GridLightbox
          src={lightbox.src}
          runHref={lightbox.runHref}
          generationId={lightbox.generationId}
          onRated={() => fetchRuns()}
          onClose={() => setLightbox(null)}
        />
      )}
    </>
  );
}

/* ─────────── Batch Run Card with embedded matrix ─────────── */

function BatchRunCard({
  batch,
  strategyId,
  retryingRunId,
  onRetry,
  onRated,
  onMarkBatchFailed,
  markingBatchId,
  onImageClick,
}: {
  batch: { id: string; runs: Run[]; status: string; createdAt: string };
  strategyId: string;
  retryingRunId: string | null;
  onRetry: (runId: string) => void;
  onRated?: () => void;
  onMarkBatchFailed?: (batchId: string) => void;
  markingBatchId: string | null;
  onImageClick: (run: Run) => void;
}) {
  const presetNames = new Set(batch.runs.map((r) => r.inputPresetName ?? '(no preset)'));
  const completedRuns = batch.runs.filter((r) => r.status === 'completed').length;
  const failedRuns = batch.runs.filter((r) => r.status === 'failed').length;
  const isMarking = markingBatchId === batch.id;

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-xs">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
            batch
          </span>
          <StatusBadge status={batch.status} />
          <span className="text-sm text-gray-600">
            {batch.runs.length} run{batch.runs.length === 1 ? '' : 's'} &middot;{' '}
            {presetNames.size} preset{presetNames.size === 1 ? '' : 's'}
          </span>
          <span className="text-xs text-gray-400">
            {completedRuns} completed{failedRuns > 0 ? `, ${failedRuns} failed` : ''}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {onMarkBatchFailed && batch.status !== 'failed' && (
            <button
              type="button"
              onClick={() => onMarkBatchFailed(batch.id)}
              disabled={isMarking}
              className="rounded border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
            >
              {isMarking ? '…' : 'Mark batch as failed'}
            </button>
          )}
          <span className="text-xs text-gray-400">
            {new Date(batch.createdAt).toLocaleString()}
          </span>
        </div>
      </div>

      <div className="p-4">
        <BatchMatrix runs={batch.runs} strategyId={strategyId} retryingRunId={retryingRunId} onRetry={onRetry} onRated={onRated} onImageClick={onImageClick} />
      </div>
    </div>
  );
}

/* ─────────── Batch Matrix ─────────── */

function BatchMatrix({
  runs,
  strategyId,
  retryingRunId,
  onRetry,
  onRated,
  onImageClick,
}: {
  runs: Run[];
  strategyId: string;
  retryingRunId: string | null;
  onRetry: (runId: string) => void;
  onRated?: () => void;
  onImageClick: (run: Run) => void;
}) {
  const byPreset = new Map<string, Run[]>();
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
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => onImageClick(run)}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onImageClick(run); }}
                            className="group relative block cursor-pointer"
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
                          </div>
                        ) : (
                          <>
                            <Link href={`/strategies/${strategyId}/runs/${run.id}`}>
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
