'use client';

import { GridLightbox } from '@/components/grid-lightbox';
import { JudgeScoreBadge } from '@/components/judge-score-badge';
import { MatrixCellRatingOverlay } from '@/components/matrix-cell-rating-overlay';
import { serviceUrl } from '@/lib/api-base';
import { parseStrategyRunJudgeResults, type StrategyRunJudgeResultEntry } from '@/lib/service-client';
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
  groupId?: string | null;
  stepResults: StepResult[];
  judgeScore?: number | null;
  isJudgeSelected?: boolean;
  judgeReasoning?: string | null;
  judgeOutput?: string | null;
  judgeSystemPrompt?: string | null;
  judgeUserPrompt?: string | null;
  judgeTypeUsed?: string | null;
  judgeResults?: StrategyRunJudgeResultEntry[] | null;
}

type ListItem = { kind: 'batch'; id: string; runs: Run[]; status: string; createdAt: string; awaitingJudge: boolean };

const POLL_INTERVAL = 3000;

function isAwaitingJudge(batchRuns: Run[], hasJudge?: boolean): boolean {
  if (!hasJudge || batchRuns.length < 2) return false;
  const allDone = batchRuns.every((r) => r.status === 'completed' || r.status === 'failed');
  if (!allDone) return false;
  const hasOutputs = batchRuns.filter((r) => r.lastOutputUrl).length >= 2;
  return hasOutputs && batchRuns.every((r) => r.judgeScore == null);
}

export function StrategyRunsList({
  strategyId,
  hasJudge,
  initialRuns,
}: {
  strategyId: string;
  hasJudge?: boolean;
  initialRuns: Run[];
}) {
  const [runs, setRuns] = useState<Run[]>(initialRuns);
  const [lightbox, setLightbox] = useState<{ src: string; runHref: string; generationId: string | null } | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'matrix'>('list');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const hasActiveRun = runs.some((r) => r.status === 'running' || r.status === 'pending');

  const batchGroups = new Map<string, Run[]>();
  for (const run of runs) {
    const runGroupId = run.groupId ?? run.batchRunId;
    if (runGroupId) {
      if (!batchGroups.has(runGroupId)) batchGroups.set(runGroupId, []);
      batchGroups.get(runGroupId)!.push(run);
    }
  }
  const hasAwaitingJudge = hasJudge && [...batchGroups.values()].some((g) => isAwaitingJudge(g, true));
  const shouldPoll = hasActiveRun || !!hasAwaitingJudge;

  const fetchRuns = useCallback(async () => {
    try {
      const res = await fetch(serviceUrl(`strategies/${strategyId}/runs`), { cache: 'no-store' });
      if (!res.ok) return;
      const json = await res.json();
      const raw = (json.data ?? []) as Record<string, unknown>[];
      setRuns(
        raw.map((row) => ({
          ...(row as unknown as Run),
          judgeResults: parseStrategyRunJudgeResults(row.judgeResults),
        })),
      );
    } catch { /* ignore */ }
  }, [strategyId]);

  useEffect(() => {
    if (shouldPoll) {
      intervalRef.current = setInterval(fetchRuns, POLL_INTERVAL);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [shouldPoll, fetchRuns]);

  const items: ListItem[] = [];

  for (const [batchId, batchRuns] of batchGroups) {
    const sorted = [...batchRuns].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const allStatuses = sorted.map((r) => r.status);
    const status = allStatuses.every((s) => s === 'completed')
      ? 'completed'
      : allStatuses.some((s) => s === 'running' || s === 'pending')
        ? 'running'
        : allStatuses.some((s) => s === 'failed')
          ? 'failed'
          : 'pending';
    items.push({ kind: 'batch', id: batchId, runs: sorted, status, createdAt: sorted[0]?.createdAt ?? '', awaitingJudge: isAwaitingJudge(sorted, hasJudge) });
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
              onRated={fetchRuns}
              onImageClick={(run) => setLightbox({ src: run.lastOutputUrl!, runHref: `/strategies/${strategyId}/runs/${run.id}`, generationId: run.lastOutputGenerationId ?? null })}
            />
          ))}
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {items.map((item) => (
            <CollapsibleBatchCard
              key={`batch-matrix-${item.id}`}
              batch={item}
              strategyId={strategyId}
              onRated={fetchRuns}
              onImageClick={(run) => setLightbox({ src: run.lastOutputUrl!, runHref: `/strategies/${strategyId}/runs/${run.id}`, generationId: run.lastOutputGenerationId ?? null })}
            />
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
  onRated,
  onImageClick,
}: {
  batch: { id: string; runs: Run[]; status: string; createdAt: string; awaitingJudge: boolean };
  strategyId: string;
  onRated?: () => void;
  onImageClick: (run: Run) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [retryingJudge, setRetryingJudge] = useState(false);
  const [judgeRetryError, setJudgeRetryError] = useState<string | null>(null);
  const presetNames = new Set(batch.runs.map((r) => r.inputPresetName ?? '(no preset)'));
  const completedRuns = batch.runs.filter((r) => r.status === 'completed').length;
  const failedRuns = batch.runs.filter((r) => r.status === 'failed' || r.status === 'skipped').length;

  const showRetryJudge = (() => {
    const completed = batch.runs.filter((r) => r.status === 'completed' && r.lastOutputUrl);
    if (completed.length < 2) return false;
    const hasFailedOrMissing = completed.some((r) => r.judgeScore === 0) || completed.every((r) => r.judgeScore == null);
    if (hasFailedOrMissing) return true;
    const missingPerJudge = completed.some((r) => !r.judgeResults || r.judgeResults.length === 0);
    return missingPerJudge;
  })();

  const handleRetryFailed = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setRetrying(true);
    try {
      const res = await fetch(serviceUrl(`strategy-batch-runs/${batch.id}/retry-failed`), { method: 'POST' });
      if (res.ok) onRated?.();
    } catch { /* ignore */ }
    finally { setRetrying(false); }
  };

  const handleRetryJudge = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setRetryingJudge(true);
    setJudgeRetryError(null);
    try {
      const res = await fetch(serviceUrl(`strategy-batch-runs/${batch.id}/retry-judge`), { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const msg = (body as { error?: { message?: string } })?.error?.message ?? `Retry failed (${res.status})`;
        setJudgeRetryError(msg);
      } else {
        const body = await res.json().catch(() => null);
        const data = (body as { data?: { failedGroups?: number; errors?: string[] } })?.data;
        if (data?.failedGroups && data.failedGroups > 0) {
          setJudgeRetryError(data.errors?.[0] ?? 'Judge failed during retry');
        }
      }
      onRated?.();
    } catch (err) {
      setJudgeRetryError(err instanceof Error ? err.message : 'Network error');
      onRated?.();
    }
    finally { setRetryingJudge(false); }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-xs">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between border-b border-gray-100 px-5 py-3 text-left hover:bg-gray-50/50"
      >
        <div className="flex items-center gap-3">
          <svg
            className={`h-4 w-4 text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
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
        <div className="flex items-center gap-3">
          {failedRuns > 0 && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleRetryFailed}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleRetryFailed(e as unknown as React.MouseEvent); }}
              className={`inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100 ${retrying ? 'pointer-events-none opacity-50' : ''}`}
            >
              {retrying ? (
                <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                </svg>
              )}
              Retry Failed ({failedRuns})
            </span>
          )}
          {showRetryJudge && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleRetryJudge}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleRetryJudge(e as unknown as React.MouseEvent); }}
              className={`inline-flex items-center gap-1.5 rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-100 ${retryingJudge ? 'pointer-events-none opacity-50' : ''}`}
            >
              {retryingJudge ? (
                <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                </svg>
              )}
              Retry Judge
            </span>
          )}
          <span className="text-xs text-gray-400">
            {new Date(batch.createdAt).toLocaleString()}
          </span>
        </div>
      </button>
      {judgeRetryError && (
        <div className="flex items-center justify-between border-b border-red-100 bg-red-50 px-5 py-2">
          <span className="text-xs text-red-700">{judgeRetryError}</span>
          <button type="button" onClick={() => setJudgeRetryError(null)} className="text-xs text-red-400 hover:text-red-600">dismiss</button>
        </div>
      )}

      {expanded && (
        <div className="p-4">
          <BatchMatrix runs={batch.runs} strategyId={strategyId} awaitingJudge={batch.awaitingJudge} onRated={onRated} onImageClick={onImageClick} />
        </div>
      )}
    </div>
  );
}

function CollapsibleBatchCard({
  batch,
  strategyId,
  onRated,
  onImageClick,
}: {
  batch: { id: string; runs: Run[]; status: string; createdAt: string; awaitingJudge: boolean };
  strategyId: string;
  onRated?: () => void;
  onImageClick: (run: Run) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [retryingJudge, setRetryingJudge] = useState(false);
  const [judgeRetryError, setJudgeRetryError] = useState<string | null>(null);
  const failedRuns = batch.runs.filter((r) => r.status === 'failed' || r.status === 'skipped').length;

  const showRetryJudge = (() => {
    const completed = batch.runs.filter((r) => r.status === 'completed' && r.lastOutputUrl);
    if (completed.length < 2) return false;
    const hasFailedOrMissing = completed.some((r) => r.judgeScore === 0) || completed.every((r) => r.judgeScore == null);
    if (hasFailedOrMissing) return true;
    const missingPerJudge = completed.some((r) => !r.judgeResults || r.judgeResults.length === 0);
    return missingPerJudge;
  })();

  const handleRetryFailed = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setRetrying(true);
    try {
      const res = await fetch(serviceUrl(`strategy-batch-runs/${batch.id}/retry-failed`), { method: 'POST' });
      if (res.ok) onRated?.();
    } catch { /* ignore */ }
    finally { setRetrying(false); }
  };

  const handleRetryJudge = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setRetryingJudge(true);
    setJudgeRetryError(null);
    try {
      const res = await fetch(serviceUrl(`strategy-batch-runs/${batch.id}/retry-judge`), { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const msg = (body as { error?: { message?: string } })?.error?.message ?? `Retry failed (${res.status})`;
        setJudgeRetryError(msg);
      } else {
        const body = await res.json().catch(() => null);
        const data = (body as { data?: { failedGroups?: number; errors?: string[] } })?.data;
        if (data?.failedGroups && data.failedGroups > 0) {
          setJudgeRetryError(data.errors?.[0] ?? 'Judge failed during retry');
        }
      }
      onRated?.();
    } catch (err) {
      setJudgeRetryError(err instanceof Error ? err.message : 'Network error');
      onRated?.();
    }
    finally { setRetryingJudge(false); }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-xs">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between border-b border-gray-100 px-4 py-2 text-left hover:bg-gray-50/50"
      >
        <span className="text-sm font-medium text-gray-700">
          Batch · {new Date(batch.createdAt).toLocaleString()}
        </span>
        <div className="flex items-center gap-2">
          {failedRuns > 0 && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleRetryFailed}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleRetryFailed(e as unknown as React.MouseEvent); }}
              className={`inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100 ${retrying ? 'pointer-events-none opacity-50' : ''}`}
            >
              {retrying ? (
                <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                </svg>
              )}
              Retry Failed ({failedRuns})
            </span>
          )}
          {showRetryJudge && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleRetryJudge}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleRetryJudge(e as unknown as React.MouseEvent); }}
              className={`inline-flex items-center gap-1.5 rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-100 ${retryingJudge ? 'pointer-events-none opacity-50' : ''}`}
            >
              {retryingJudge ? (
                <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                </svg>
              )}
              Retry Judge
            </span>
          )}
          <StatusBadge status={batch.status} />
          <svg
            className={`h-5 w-5 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      {judgeRetryError && (
        <div className="flex items-center justify-between border-b border-red-100 bg-red-50 px-4 py-2">
          <span className="text-xs text-red-700">{judgeRetryError}</span>
          <button type="button" onClick={() => setJudgeRetryError(null)} className="text-xs text-red-400 hover:text-red-600">dismiss</button>
        </div>
      )}
      {expanded && (
        <div className="p-4">
          <BatchMatrix runs={batch.runs} strategyId={strategyId} awaitingJudge={batch.awaitingJudge} onRated={onRated} onImageClick={onImageClick} />
        </div>
      )}
    </div>
  );
}

/* ─────────── Batch Matrix ─────────── */

function BatchMatrix({
  runs,
  strategyId,
  awaitingJudge,
  onRated,
  onImageClick,
}: {
  runs: Run[];
  strategyId: string;
  awaitingJudge?: boolean;
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
              className="sticky left-0 z-20 border-r border-gray-200 bg-gray-50 px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-600"
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
                <td className="sticky left-0 z-20 border-r border-gray-200 bg-white px-4 text-sm font-medium text-gray-900"
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
                              className={`rounded-lg object-cover shadow-sm transition-shadow hover:shadow-md ${run.isJudgeSelected ? 'border-2 border-amber-400 ring-2 ring-amber-200' : 'border border-gray-200'}`}
                              style={{ width: CELL - 20, height: CELL - 20 }} />
                            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/0 transition-colors group-hover:bg-black/20">
                              <svg className="h-8 w-8 text-white opacity-0 drop-shadow transition-opacity group-hover:opacity-100" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                              </svg>
                            </div>
                            <JudgeScoreBadge
                              runId={run.id}
                              judgeScore={run.judgeScore}
                              isJudgeSelected={run.isJudgeSelected}
                              judgeReasoning={run.judgeReasoning}
                              judgeOutput={run.judgeOutput}
                              judgeSystemPrompt={run.judgeSystemPrompt}
                              judgeUserPrompt={run.judgeUserPrompt}
                              judgeTypeUsed={run.judgeTypeUsed}
                              judgeResults={run.judgeResults ?? null}
                              awaitingJudge={awaitingJudge}
                            />
                            {run.lastOutputGenerationId && (
                              <MatrixCellRatingOverlay generationId={run.lastOutputGenerationId} onRated={onRated} />
                            )}
                          </div>
                        ) : (
                          <Link href={`/strategies/${strategyId}/runs/${run.id}`}>
                            <StatusBadge status={run.status} />
                          </Link>
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
