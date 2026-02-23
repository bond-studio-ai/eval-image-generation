'use client';

import type { InputPresetListItem } from '@/lib/queries';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StrategyBatchRunButton, StrategyRunButton } from './run-button';

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
  batchRunId?: string | null;
  stepResults: StepResult[];
}

type ListItem =
  | { kind: 'batch'; id: string; runs: Run[]; status: string; createdAt: string }
  | { kind: 'run'; run: Run };

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

  const handleRunCreated = useCallback(() => { fetchRuns(); }, [fetchRuns]);

  const handleRetry = useCallback(async (runId: string) => {
    setRetryingRunId(runId);
    try {
      const res = await fetch(`/api/v1/strategy-runs/${runId}/retry`, { method: 'POST' });
      if (!res.ok) return;
      await fetchRuns();
    } catch { /* ignore */ }
    finally { setRetryingRunId(null); }
  }, [fetchRuns]);

  // Build unified chronological list: batch cards + individual run rows
  const items: ListItem[] = [];
  const batchMap = new Map<string, Run[]>();

  for (const run of runs) {
    if (run.batchRunId) {
      if (!batchMap.has(run.batchRunId)) batchMap.set(run.batchRunId, []);
      batchMap.get(run.batchRunId)!.push(run);
    } else {
      items.push({ kind: 'run', run });
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

  items.sort((a, b) => {
    const dateA = a.kind === 'batch' ? a.createdAt : a.run.createdAt;
    const dateB = b.kind === 'batch' ? b.createdAt : b.run.createdAt;
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  });

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Runs</h2>
        <div className="flex items-center gap-2">
          <StrategyBatchRunButton strategyId={strategyId} inputPresets={inputPresets} onRunCreated={handleRunCreated} />
          <StrategyRunButton strategyId={strategyId} inputPresets={inputPresets} onRunCreated={handleRunCreated} />
        </div>
      </div>

      {items.length === 0 ? (
        <p className="mt-4 text-sm text-gray-600">No runs yet. Click &ldquo;Run&rdquo; or &ldquo;Run Batch&rdquo; to execute.</p>
      ) : (
        <div className="mt-4 space-y-4">
          {items.map((item) =>
            item.kind === 'batch' ? (
              <BatchRunCard
                key={`batch-${item.id}`}
                batch={item}
                strategyId={strategyId}
                retryingRunId={retryingRunId}
                onRetry={handleRetry}
              />
            ) : (
              <IndividualRunCard
                key={`run-${item.run.id}`}
                run={item.run}
                strategyId={strategyId}
                retryingRunId={retryingRunId}
                onRetry={handleRetry}
              />
            ),
          )}
        </div>
      )}
    </>
  );
}

/* ─────────── Individual Run Card ─────────── */

function IndividualRunCard({
  run,
  strategyId,
  retryingRunId,
  onRetry,
}: {
  run: Run;
  strategyId: string;
  retryingRunId: string | null;
  onRetry: (runId: string) => void;
}) {
  const completed = run.stepResults.filter((sr) => sr.status === 'completed').length;
  const total = run.stepResults.length;

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-xs">
      <div className="flex items-center justify-between px-5 py-3">
        <div className="flex items-center gap-3">
          <StatusBadge status={run.status} />
          <span className="text-sm font-medium text-gray-900">
            {run.inputPresetName || <span className="text-gray-400">No preset</span>}
          </span>
          <span className="text-xs text-gray-400">
            Steps {completed}/{total}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">{new Date(run.createdAt).toLocaleString()}</span>
          {run.status === 'failed' && (
            <button type="button" onClick={() => onRetry(run.id)} disabled={retryingRunId === run.id}
              className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 hover:text-amber-500 disabled:opacity-50">
              {retryingRunId === run.id ? 'Retrying…' : 'Retry'}
            </button>
          )}
          <Link href={`/strategies/${strategyId}/runs/${run.id}`}
            className="text-primary-600 hover:text-primary-500 text-xs font-medium">
            View
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ─────────── Batch Run Card with embedded matrix ─────────── */

function BatchRunCard({
  batch,
  strategyId,
  retryingRunId,
  onRetry,
}: {
  batch: { id: string; runs: Run[]; status: string; createdAt: string };
  strategyId: string;
  retryingRunId: string | null;
  onRetry: (runId: string) => void;
}) {
  const presetNames = new Set(batch.runs.map((r) => r.inputPresetName ?? '(no preset)'));
  const completedRuns = batch.runs.filter((r) => r.status === 'completed').length;
  const failedRuns = batch.runs.filter((r) => r.status === 'failed').length;

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
        <span className="text-xs text-gray-400">
          {new Date(batch.createdAt).toLocaleString()}
        </span>
      </div>

      <div className="p-4">
        <BatchMatrix runs={batch.runs} strategyId={strategyId} retryingRunId={retryingRunId} onRetry={onRetry} />
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
}: {
  runs: Run[];
  strategyId: string;
  retryingRunId: string | null;
  onRetry: (runId: string) => void;
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

  const CELL = 160;

  return (
    <div className="overflow-x-auto overflow-y-hidden rounded-lg border border-gray-200">
      <table className="divide-y divide-gray-200" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
        <thead className="bg-gray-50">
          <tr>
            <th
              className="sticky left-0 z-10 border-r border-gray-200 bg-gray-50 px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-600"
              style={{ minWidth: 200 }}
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
                  style={{ minWidth: 200 }}>
                  <span className="block max-w-[200px] truncate">{presetName}</span>
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
                          <Link href={`/strategies/${strategyId}/runs/${run.id}`} className="block">
                            <img src={run.lastOutputUrl} alt=""
                              className="rounded-lg border border-gray-200 object-cover shadow-sm"
                              style={{ width: CELL - 20, height: CELL - 20 }} />
                          </Link>
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
