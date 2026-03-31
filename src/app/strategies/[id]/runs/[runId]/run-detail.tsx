'use client';

import { ExpandableImage } from '@/components/expandable-image';
import { buildPanels, ReasoningModal } from '@/components/judge-score-badge';
import { RunJudgeEvaluationsSection } from '@/components/run-judge-evaluations-section';
import { StrategyFlowDag, type DagStep } from '@/components/strategy-flow-dag';
import { ViewPromptModal } from '@/components/view-prompt-modal';
import { serviceUrl } from '@/lib/api-base';
import { parseStrategyRunJudgeResults, type StrategyRunJudgeResultEntry } from '@/lib/service-client';
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
}

interface InputImage {
  url: string;
  label: string;
  isComposite?: boolean;
  sourceImages?: { url: string; label: string }[];
}

interface StepResult {
  id: string;
  status: string;
  outputUrl: string | null;
  error: string | null;
  executionTime: number | null;
  generationId: string | null;
  processedUserPrompt: string | null;
  processedSystemPrompt: string | null;
  inputImages: InputImage[] | null;
  requestConfig: Record<string, unknown> | null;
  step: StepInfo | null;
}

interface RunData {
  id: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
  judgeScore: number | null;
  isJudgeSelected: boolean;
  judgeReasoning: string | null;
  judgeOutput: string | null;
  source: string | null;
  judgeSystemPrompt: string | null;
  judgeUserPrompt: string | null;
  judgeInputImages: InputImage[] | null;
  judgeTypeUsed: string | null;
  judgeResults: StrategyRunJudgeResultEntry[];
  strategy: {
    id: string;
    name: string;
    model?: string;
    aspectRatio?: string;
    outputResolution?: string;
    temperature?: string | null;
    useGoogleSearch?: boolean;
    tagImages?: boolean;
    hasJudge?: boolean;
  };
  stepResults: StepResult[];
}

const POLL_INTERVAL = 3000;

const SOURCE_LABELS: Record<string, string> = {
  preset: 'Preset Run',
  raw_input: 'API (Raw Input)',
  batch: 'Batch Run',
  retry: 'Retry',
};

const CONFIG_LABELS: Record<string, string> = {
  model: 'Model',
  aspect_ratio: 'Aspect Ratio',
  output_resolution: 'Resolution',
  temperature: 'Temperature',
  use_google_search: 'Google Search',
  tag_images: 'Tag Images',
};

function SourceBadge({ source }: { source: string | null }) {
  if (!source) return null;
  const colors: Record<string, string> = {
    preset: 'bg-blue-100 text-blue-700',
    raw_input: 'bg-purple-100 text-purple-700',
    batch: 'bg-teal-100 text-teal-700',
    retry: 'bg-orange-100 text-orange-700',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[source] ?? 'bg-gray-100 text-gray-700'}`}>
      {SOURCE_LABELS[source] ?? source}
    </span>
  );
}

function AuditImageGrid({ images }: { images: InputImage[] }) {
  const [expandedGroup, setExpandedGroup] = useState<number | null>(null);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
        {images.map((img, i) => (
          <div key={i} className="group relative">
            <div
              className={`aspect-square overflow-hidden rounded-md border bg-gray-50 ${img.isComposite ? 'border-violet-400 ring-1 ring-violet-200' : 'border-gray-200'}`}
              {...(img.isComposite ? { role: 'button', onClick: () => setExpandedGroup(expandedGroup === i ? null : i) } : {})}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt={img.label} className="h-full w-full object-cover" loading="lazy" />
            </div>
            <div className="mt-1 flex items-center gap-1">
              {img.isComposite && (
                <span className="inline-flex shrink-0 items-center rounded bg-violet-100 px-1 py-px text-[9px] font-semibold text-violet-700">
                  Group
                </span>
              )}
              <p className="truncate text-[10px] leading-tight text-gray-500" title={img.label}>
                {img.label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {expandedGroup != null && images[expandedGroup]?.isComposite && images[expandedGroup].sourceImages && (
        <div className="rounded-lg border border-violet-200 bg-violet-50 p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold text-violet-800">
              {images[expandedGroup].label} &mdash; {images[expandedGroup].sourceImages!.length} source images
            </p>
            <button
              onClick={() => setExpandedGroup(null)}
              className="text-xs text-violet-600 hover:text-violet-800"
            >
              Close
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
            {images[expandedGroup].sourceImages!.map((src, j) => (
              <div key={j}>
                <div className="aspect-square overflow-hidden rounded-md border border-violet-200 bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src.url} alt={src.label} className="h-full w-full object-cover" loading="lazy" />
                </div>
                <p className="mt-1 truncate text-[10px] leading-tight text-violet-700" title={src.label}>
                  {src.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CollapsibleSection({ title, defaultOpen, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <div className="border-t border-gray-100">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-4 py-2 text-left text-xs font-medium text-gray-600 hover:bg-gray-50"
      >
        <svg className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
        {title}
      </button>
      {open && <div className="px-4 pb-3">{children}</div>}
    </div>
  );
}

function StepAudit({ sr }: { sr: StepResult }) {
  const hasAudit = sr.processedSystemPrompt || sr.processedUserPrompt || sr.inputImages || sr.requestConfig;
  if (!hasAudit) return null;

  return (
    <CollapsibleSection title="Audit Details">
      <div className="space-y-3">
        {sr.requestConfig && (
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Request Config</p>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(sr.requestConfig).map(([key, val]) => (
                <span key={key} className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-[11px] text-gray-700">
                  <span className="font-medium text-gray-500">{CONFIG_LABELS[key] ?? key}:</span>&nbsp;{String(val ?? 'null')}
                </span>
              ))}
            </div>
          </div>
        )}

        {sr.processedSystemPrompt && (
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">System Prompt</p>
            <pre className="max-h-48 overflow-auto rounded-md border border-gray-200 bg-gray-50 p-2 text-xs leading-relaxed text-gray-700 whitespace-pre-wrap">{sr.processedSystemPrompt}</pre>
          </div>
        )}

        {sr.processedUserPrompt && (
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">User Prompt</p>
            <pre className="max-h-48 overflow-auto rounded-md border border-gray-200 bg-gray-50 p-2 text-xs leading-relaxed text-gray-700 whitespace-pre-wrap">{sr.processedUserPrompt}</pre>
          </div>
        )}

        {sr.inputImages && sr.inputImages.length > 0 && (
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              Input Images ({sr.inputImages.length})
            </p>
            <AuditImageGrid images={sr.inputImages} />
          </div>
        )}
      </div>
    </CollapsibleSection>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-700',
    running: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
    skipped: 'bg-amber-100 text-amber-700',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status] ?? styles.pending}`}>
      {status}
    </span>
  );
}

export function RunDetail({ strategyId, runId, initialData }: { strategyId: string; runId: string; initialData: RunData }) {
  const [data, setData] = useState<RunData>(initialData);
  const [retrying, setRetrying] = useState(false);
  const [markingStatus, setMarkingStatus] = useState<'idle' | 'failed' | 'completed'>('idle');
  const [viewingPromptId, setViewingPromptId] = useState<string | null>(null);
  const [viewingPromptName, setViewingPromptName] = useState<string | null>(null);
  const [viewingProcessedPrompt, setViewingProcessedPrompt] = useState<string | null>(null);
  const [showJudgeModal, setShowJudgeModal] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isActive = data.status === 'running' || data.status === 'pending';

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(serviceUrl(`strategy-runs/${runId}`), { cache: 'no-store' });
      if (!res.ok) return;
      const json = await res.json();
      if (json.data) {
        const raw = json.data as Record<string, unknown>;
        setData({
          ...(json.data as RunData),
          judgeResults: parseStrategyRunJudgeResults(raw.judgeResults),
        });
      }
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

  const handleRetry = useCallback(async () => {
    setRetrying(true);
    try {
      const res = await fetch(serviceUrl(`strategy-runs/${runId}/retry`), { method: 'POST' });
      if (!res.ok) return;
      await fetchData();
    } catch { /* ignore */ }
    finally { setRetrying(false); }
  }, [runId, fetchData]);

  const handleMarkStatus = useCallback(async (status: 'failed' | 'completed') => {
    setMarkingStatus(status);
    try {
      const res = await fetch(serviceUrl(`strategy-runs/${runId}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) return;
      await fetchData();
    } catch { /* ignore */ }
    finally { setMarkingStatus('idle'); }
  }, [runId, fetchData]);

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
      dollhouseViewFromStep: sr.step!.dollhouseViewFromStep,
      realPhotoFromStep: sr.step!.realPhotoFromStep,
      moodBoardFromStep: sr.step!.moodBoardFromStep,
      status: sr.status as DagStep['status'],
      error: sr.error,
    }));

  const dagJudges = [...data.judgeResults]
    .sort((a, b) => a.position - b.position)
    .map((j) => ({
      name: j.judgeName,
      type: j.judgeType,
      model: j.judgeModel,
      promptName: j.judgePromptVersionName,
      position: j.position,
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
        <div className="flex items-center gap-3">
          {data.status !== 'failed' && data.status !== 'skipped' && (
            <button
              type="button"
              onClick={() => handleMarkStatus('failed')}
              disabled={markingStatus !== 'idle'}
              className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50"
            >
              {markingStatus === 'failed' ? (
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : null}
              Mark as failed
            </button>
          )}
          {(data.status === 'failed' || data.status === 'skipped') && (
            <>
              <button
                type="button"
                onClick={() => handleMarkStatus('completed')}
                disabled={markingStatus !== 'idle'}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-50"
              >
                {markingStatus === 'completed' ? (
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : null}
                Mark as completed
              </button>
              <button
                type="button"
                onClick={handleRetry}
                disabled={retrying}
                className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-100 disabled:opacity-50"
              >
                {retrying ? (
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                  </svg>
                )}
                Retry
              </button>
            </>
          )}
          <SourceBadge source={data.source} />
          <StatusBadge status={data.status} />
          {data.judgeScore != null && data.judgeScore > 0 ? (
            <>
              <button
                type="button"
                onClick={() => setShowJudgeModal(true)}
                className={`inline-flex cursor-pointer items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${data.isJudgeSelected ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                {data.isJudgeSelected && (
                  <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                )}
                Score: {data.judgeScore}
              </button>
              {showJudgeModal && (
                <ReasoningModal
                  aggregateScore={data.judgeScore}
                  panels={buildPanels(data.judgeResults, {
                    judgeReasoning: data.judgeReasoning,
                    judgeOutput: data.judgeOutput,
                    judgeSystemPrompt: data.judgeSystemPrompt,
                    judgeUserPrompt: data.judgeUserPrompt,
                    judgeTypeUsed: data.judgeTypeUsed,
                    judgeScore: data.judgeScore,
                  })}
                  isSelected={data.isJudgeSelected}
                  isFailed={false}
                  onClose={() => setShowJudgeModal(false)}
                />
              )}
            </>
          ) : (data.judgeScore === 0 || (data.strategy.hasJudge && data.status === 'completed' && sorted.some((sr) => sr.outputUrl) && data.judgeScore == null)) ? (
            <>
              <button
                type="button"
                onClick={() => setShowJudgeModal(true)}
                className="inline-flex cursor-pointer items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800 transition-colors hover:bg-red-200"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" /></svg>
                Judge failed
              </button>
              {showJudgeModal && (
                <ReasoningModal
                  aggregateScore={data.judgeScore ?? 0}
                  panels={buildPanels(data.judgeResults, {
                    judgeReasoning: data.judgeReasoning,
                    judgeOutput: data.judgeOutput,
                    judgeSystemPrompt: data.judgeSystemPrompt,
                    judgeUserPrompt: data.judgeUserPrompt,
                    judgeTypeUsed: data.judgeTypeUsed,
                    judgeScore: data.judgeScore,
                  })}
                  isFailed={data.judgeScore === 0}
                  onClose={() => setShowJudgeModal(false)}
                />
              )}
            </>
          ) : null}
        </div>
      </div>

      {/* Run-level skip reason when run is skipped */}
      {data.status === 'skipped' && (() => {
        const skippedReasons = sorted
          .filter((sr) => sr.status === 'skipped' && sr.error)
          .map((sr) => ({ step: sr.step?.name ?? `Step ${sr.step?.stepOrder}`, reason: sr.error! }));
        if (skippedReasons.length === 0) return null;
        return (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-medium text-amber-800">Why this run was skipped</p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-amber-700">
              {skippedReasons.map(({ step, reason }, i) => (
                <li key={i}>
                  <span className="font-medium">{step}:</span> {reason}
                </li>
              ))}
            </ul>
          </div>
        );
      })()}

      {/* Strategy settings tags */}
      {(data.strategy.model != null || data.strategy.aspectRatio != null) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {data.strategy.model != null && (
            <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
              Model: {data.strategy.model}
            </span>
          )}
          {data.strategy.aspectRatio != null && (
            <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
              Aspect: {data.strategy.aspectRatio}
            </span>
          )}
          {data.strategy.outputResolution != null && (
            <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
              Resolution: {data.strategy.outputResolution}
            </span>
          )}
          {data.strategy.temperature != null && (
            <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
              Temp: {data.strategy.temperature}
            </span>
          )}
          {data.strategy.tagImages != null && (
            <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
              Tag images: {data.strategy.tagImages ? 'Yes' : 'No'}
            </span>
          )}
          {data.strategy.useGoogleSearch != null && (
            <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
              Google Search: {data.strategy.useGoogleSearch ? 'Yes' : 'No'}
            </span>
          )}
        </div>
      )}

      {data.judgeResults.length > 0 && (
        <div className="mt-4">
          <RunJudgeEvaluationsSection judgeResults={data.judgeResults} />
        </div>
      )}

      {/* Judge reasoning (skip when a single per-judge row already shows the same in RunJudgeEvaluationsSection) */}
      {data.judgeResults.length !== 1 && data.judgeReasoning && (() => {
        const isFailed = data.judgeScore === 0;
        return (
          <div className={`mt-4 rounded-lg border p-4 ${isFailed ? 'border-red-200 bg-red-50' : 'border-indigo-200 bg-indigo-50'}`}>
            <div className="flex items-center gap-2">
              {isFailed ? (
                <svg className="h-4 w-4 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
                </svg>
              ) : (
                <svg className="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                </svg>
              )}
              <p className={`text-sm font-medium ${isFailed ? 'text-red-800' : 'text-indigo-800'}`}>
                {isFailed ? 'Judge Error' : 'Judge Reasoning'}
                {data.judgeScore != null && data.judgeScore > 0 && (
                  <span className="ml-2 font-normal text-indigo-600">
                    (Score: {data.judgeScore}{data.isJudgeSelected ? ' — Selected' : ''})
                  </span>
                )}
              </p>
            </div>
            <p className={`mt-2 text-sm ${isFailed ? 'text-red-700' : 'text-indigo-700'}`}>{data.judgeReasoning}</p>
          </div>
        );
      })()}

      {/* Judge output (aggregated; omitted when exactly one per-judge row holds the same) */}
      {data.judgeResults.length !== 1 && data.judgeOutput && (
        <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <p className="text-sm font-medium text-gray-800">Judge Output</p>
          <pre className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-gray-700">{data.judgeOutput}</pre>
        </div>
      )}

      {/* Judge audit (legacy single-judge snapshot on strategy_run) */}
      {data.judgeResults.length === 0 &&
        (data.judgeSystemPrompt || data.judgeUserPrompt || data.judgeInputImages) && (
        <div className="mt-4 rounded-lg border border-gray-200 bg-white shadow-xs">
          <CollapsibleSection title="Judge Audit Details">
            <div className="space-y-3">
              {data.judgeTypeUsed && (
                <div>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Judge Mode</p>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    data.judgeTypeUsed === 'batch'
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {data.judgeTypeUsed === 'batch' ? 'Batch (all images in one request)' : 'Individual (one image per request)'}
                  </span>
                </div>
              )}
              {data.judgeSystemPrompt && (
                <div>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Judge System Prompt</p>
                  <pre className="max-h-48 overflow-auto rounded-md border border-gray-200 bg-gray-50 p-2 text-xs leading-relaxed text-gray-700 whitespace-pre-wrap">{data.judgeSystemPrompt}</pre>
                </div>
              )}
              {data.judgeUserPrompt && (
                <div>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Judge User Prompt</p>
                  <pre className="max-h-48 overflow-auto rounded-md border border-gray-200 bg-gray-50 p-2 text-xs leading-relaxed text-gray-700 whitespace-pre-wrap">{data.judgeUserPrompt}</pre>
                </div>
              )}
              {data.judgeInputImages && data.judgeInputImages.length > 0 && (
                <div>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    Judge Input Images ({data.judgeInputImages.length})
                  </p>
                  <AuditImageGrid images={data.judgeInputImages} />
                </div>
              )}
            </div>
          </CollapsibleSection>
        </div>
      )}

      {/* DAG visualization */}
      {dagSteps.length > 0 && (
        <div className="mt-6">
          <StrategyFlowDag steps={dagSteps} judges={dagJudges} />
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
                  <>
                    <span className="text-sm text-gray-500">
                      Prompt: <Link href={`/prompt-versions/${sr.step.promptVersion.id}`} className="text-primary-600 hover:text-primary-500">{sr.step.promptVersion.name || 'Untitled'}</Link>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setViewingPromptId(sr.step!.promptVersion!.id);
                        setViewingPromptName(sr.step!.promptVersion!.name);
                        setViewingProcessedPrompt(sr.processedUserPrompt ?? null);
                      }}
                      className="text-xs text-gray-500 underline hover:text-gray-700"
                    >
                      View prompt
                    </button>
                  </>
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
              ) : sr.status === 'skipped' ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-medium text-amber-700">Step skipped</p>
                  {sr.error && <p className="mt-1 text-sm text-amber-600">{sr.error}</p>}
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

            <StepAudit sr={sr} />
          </div>
        ))}
      </div>

      {viewingPromptId && (
        <ViewPromptModal
          promptVersionId={viewingPromptId}
          promptVersionName={viewingPromptName}
          processedUserPrompt={viewingProcessedPrompt}
          onClose={() => { setViewingPromptId(null); setViewingPromptName(null); setViewingProcessedPrompt(null); }}
        />
      )}
    </div>
  );
}
