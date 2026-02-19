'use client';

import { ExpandableImage } from '@/components/expandable-image';
import { StrategyFlowDag, type DagStep } from '@/components/strategy-flow-dag';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

interface StepInfo {
  stepOrder: number;
  name: string | null;
  model: string;
  aspectRatio: string;
  outputResolution: string;
  temperature: string | null;
  dollhouseViewFromStep: number | null;
  realPhotoFromStep: number | null;
  moodBoardFromStep: number | null;
  promptVersion: { id: string; name: string | null } | null;
  inputPreset: { id: string; name: string | null } | null;
}

interface StepResult {
  id: string;
  status: string;
  outputUrl: string | null;
  error: string | null;
  executionTime: number | null;
  generationId: string | null;
  step: StepInfo | null;
}

interface RunData {
  id: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
  strategy: { id: string; name: string };
  stepResults: StepResult[];
}

const POLL_INTERVAL = 3000;

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

export function RunDetail({ strategyId, runId, initialData }: { strategyId: string; runId: string; initialData: RunData }) {
  const [data, setData] = useState<RunData>(initialData);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isActive = data.status === 'running' || data.status === 'pending';

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/strategy-runs/${runId}`, { cache: 'no-store' });
      if (!res.ok) return;
      const json = await res.json();
      if (json.data) setData(json.data);
    } catch { /* ignore */ }
  }, [runId]);

  useEffect(() => {
    if (isActive) {
      fetchData();
      intervalRef.current = setInterval(fetchData, POLL_INTERVAL);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive, fetchData]);

  const sorted = [...data.stepResults].sort(
    (a, b) => (a.step?.stepOrder ?? 0) - (b.step?.stepOrder ?? 0),
  );

  const dagSteps: DagStep[] = sorted
    .filter((sr) => sr.step)
    .map((sr) => ({
      stepOrder: sr.step!.stepOrder,
      label: sr.step!.name || `Step ${sr.step!.stepOrder}`,
      model: sr.step!.model,
      aspectRatio: sr.step!.aspectRatio,
      outputResolution: sr.step!.outputResolution,
      temperature: sr.step!.temperature,
      promptName: sr.step!.promptVersion?.name,
      inputPresetName: sr.step!.inputPreset?.name,
      status: sr.status as DagStep['status'],
      dollhouseViewFromStep: sr.step!.dollhouseViewFromStep,
      realPhotoFromStep: sr.step!.realPhotoFromStep,
      moodBoardFromStep: sr.step!.moodBoardFromStep,
    }));

  return (
    <div>
      <Link href={`/strategies/${strategyId}`} className="text-sm text-gray-600 hover:text-gray-900">
        &larr; Back to {data.strategy.name}
      </Link>

      <div className="mt-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Strategy Run</h1>
          <p className="mt-1 text-sm text-gray-500">
            {data.strategy.name} &middot; {new Date(data.createdAt).toLocaleString()}
          </p>
        </div>
        <StatusBadge status={data.status} />
      </div>

      {/* DAG visualization */}
      {dagSteps.length > 0 && (
        <div className="mt-6">
          <StrategyFlowDag steps={dagSteps} />
        </div>
      )}

      {/* Step Results */}
      <div className="mt-8 space-y-6">
        {sorted.length === 0 && (
          <p className="text-sm text-gray-500">No step results yet.</p>
        )}
        {sorted.map((sr) => (
          <div
            key={sr.id}
            className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xs"
          >
            <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center justify-center rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-semibold text-primary-700">
                  {sr.step?.name || `Step ${sr.step?.stepOrder}`}
                </span>
                <span className="text-sm text-gray-600">{sr.step?.model}</span>
                {sr.step?.promptVersion && (
                  <span className="text-sm text-gray-500">
                    Prompt: <Link href={`/prompt-versions/${sr.step.promptVersion.id}`} className="text-primary-600 hover:text-primary-500">{sr.step.promptVersion.name || 'Untitled'}</Link>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {sr.executionTime && (
                  <span className="text-xs text-gray-500">{(sr.executionTime / 1000).toFixed(1)}s</span>
                )}
                <StatusBadge status={sr.status} />
              </div>
            </div>

            <div className="p-4">
              {(sr.step?.dollhouseViewFromStep || sr.step?.realPhotoFromStep || sr.step?.moodBoardFromStep) && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {sr.step.dollhouseViewFromStep && (
                    <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-600/20 ring-inset">
                      Dollhouse View &larr; Step {sr.step.dollhouseViewFromStep}
                    </span>
                  )}
                  {sr.step.realPhotoFromStep && (
                    <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-600/20 ring-inset">
                      Real Photo &larr; Step {sr.step.realPhotoFromStep}
                    </span>
                  )}
                  {sr.step.moodBoardFromStep && (
                    <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-600/20 ring-inset">
                      Mood Board &larr; Step {sr.step.moodBoardFromStep}
                    </span>
                  )}
                </div>
              )}

              {sr.status === 'completed' && sr.outputUrl ? (
                <div>
                  <ExpandableImage
                    src={sr.outputUrl}
                    alt={`Step ${sr.step?.stepOrder} output`}
                    wrapperClassName="relative block h-80 w-full max-w-xl rounded-lg border border-gray-200 bg-gray-50"
                  />
                  {sr.generationId && (
                    <p className="mt-2 text-xs text-gray-500">
                      <Link href={`/generations/${sr.generationId}`} className="text-primary-600 hover:text-primary-500">
                        View generation detail &rarr;
                      </Link>
                    </p>
                  )}
                </div>
              ) : sr.status === 'failed' ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                  <p className="text-sm font-medium text-red-700">Step failed</p>
                  {sr.error && <p className="mt-1 text-sm text-red-600">{sr.error}</p>}
                </div>
              ) : sr.status === 'running' ? (
                <div className="flex items-center gap-2 py-4">
                  <svg className="h-5 w-5 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span className="text-sm text-gray-600">Running...</span>
                </div>
              ) : (
                <p className="py-4 text-sm text-gray-400">Pending</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
