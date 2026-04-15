'use client';

import { ExpandableImage } from '@/components/expandable-image';
import { buildPanels, ReasoningModal } from '@/components/judge-score-badge';
import { RunJudgeEvaluationsSection } from '@/components/run-judge-evaluations-section';
import { StrategyFlowDag, type DagStep } from '@/components/strategy-flow-dag';
import { ViewPromptModal } from '@/components/view-prompt-modal';
import { PageHeader } from '@/components/page-header';
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
  isJudgeSelected: boolean;
  processedUserPrompt: string | null;
  processedSystemPrompt: string | null;
  inputImages: InputImage[] | null;
  requestConfig: Record<string, unknown> | null;
  step: StepInfo | null;
}

interface StepGroup {
  stepOrder: number;
  name: string;
  model: string;
  step: StepInfo | null;
  results: StepResult[];
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
  raw_input: 'Real Input',
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

/* ---------- small reusable pieces ---------- */

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

function ChevronIcon({ open, className = 'h-4 w-4' }: { open: boolean; className?: string }) {
  return (
    <svg className={`${className} shrink-0 text-gray-400 transition-transform duration-200 ${open ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  );
}

function SectionToggle({
  title,
  count,
  badge,
  open,
  onToggle,
  children,
}: {
  title: string;
  count?: number;
  badge?: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-xs">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-gray-50"
      >
        <ChevronIcon open={open} />
        <span className="text-sm font-semibold text-gray-900">{title}</span>
        {count != null && (
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
            {count}
          </span>
        )}
        {badge}
      </button>
      {open && <div className="border-t border-gray-200">{children}</div>}
    </div>
  );
}

/* ---------- Audit sub-components ---------- */

function AuditImageGrid({ images }: { images: InputImage[] }) {
  const [expandedGroup, setExpandedGroup] = useState<number | null>(null);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
        {images.map((img, i) => (
          <div key={i} className="group relative">
            {img.isComposite ? (
              <div
                className="aspect-square cursor-pointer overflow-hidden rounded-md border border-violet-400 bg-gray-50 ring-1 ring-violet-200"
                role="button"
                onClick={() => setExpandedGroup(expandedGroup === i ? null : i)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt={img.label} className="h-full w-full object-cover" loading="lazy" />
              </div>
            ) : (
              <ExpandableImage
                src={img.url}
                alt={img.label}
                wrapperClassName="relative block aspect-square w-full overflow-hidden rounded-md border border-gray-200 bg-gray-50"
                className="h-full w-full object-cover"
              />
            )}
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
            <button onClick={() => setExpandedGroup(null)} className="text-xs text-violet-600 hover:text-violet-800">Close</button>
          </div>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
            {images[expandedGroup].sourceImages!.map((src, j) => (
              <div key={j}>
                <ExpandableImage
                  src={src.url}
                  alt={src.label}
                  wrapperClassName="relative block aspect-square w-full overflow-hidden rounded-md border border-violet-200 bg-white"
                  className="h-full w-full object-cover"
                />
                <p className="mt-1 truncate text-[10px] leading-tight text-violet-700" title={src.label}>{src.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AuditCollapsible({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-gray-100">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-4 py-2 text-left text-xs font-medium text-gray-500 hover:bg-gray-50"
      >
        <ChevronIcon open={open} className="h-3 w-3" />
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
    <AuditCollapsible title="Audit Details">
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
    </AuditCollapsible>
  );
}

/* ---------- Grouping helper ---------- */

function groupStepResults(sorted: StepResult[]): StepGroup[] {
  const map = new Map<number, StepGroup>();
  for (const sr of sorted) {
    const order = sr.step?.stepOrder ?? 0;
    if (!map.has(order)) {
      map.set(order, {
        stepOrder: order,
        name: sr.step?.name || `Step ${order}`,
        model: sr.step?.model ?? '',
        step: sr.step,
        results: [],
      });
    }
    map.get(order)!.results.push(sr);
  }
  return [...map.values()].sort((a, b) => a.stepOrder - b.stepOrder);
}

/* ---------- Generation image tile ---------- */

function GenerationTile({ sr, index, total, isSelected }: { sr: StepResult; index: number; total: number; isSelected: boolean }) {
  const label = `${index + 1} of ${total}`;

  if (sr.status === 'completed' && sr.outputUrl) {
    return (
      <div className="flex flex-col gap-1.5">
        <div className={`relative overflow-hidden rounded-lg border-2 ${isSelected ? 'border-amber-400 ring-2 ring-amber-200' : 'border-gray-200'}`}>
          <ExpandableImage
            src={sr.outputUrl}
            alt={`Generation ${index + 1}`}
            wrapperClassName="relative block h-48 w-full cursor-pointer bg-gray-50"
          />
          {isSelected && (
            <div className="absolute top-1.5 left-1.5 flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white shadow">
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              Judge pick
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 text-[11px] text-gray-500">
          <span className="font-medium text-gray-700">{label}</span>
          {sr.executionTime != null && <span className="tabular-nums">{(sr.executionTime / 1000).toFixed(1)}s</span>}
          <StatusBadge status={sr.status} />
          {sr.generationId && (
            <Link href={`/generations/${sr.generationId}`} className="text-primary-600 hover:text-primary-500">
              Detail &rarr;
            </Link>
          )}
        </div>
      </div>
    );
  }

  if (sr.status === 'failed') {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex h-48 w-full items-center justify-center rounded-lg border-2 border-red-200 bg-red-50 p-3">
          <div className="text-center">
            <p className="text-xs font-medium text-red-700">Failed</p>
            {sr.error && <p className="mt-1 text-[11px] text-red-600 line-clamp-3">{sr.error}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-gray-500">
          <span className="font-medium text-gray-700">{label}</span>
          <StatusBadge status={sr.status} />
        </div>
      </div>
    );
  }

  if (sr.status === 'running') {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex h-48 w-full items-center justify-center rounded-lg border-2 border-blue-200 bg-blue-50">
          <svg className="h-6 w-6 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-gray-500">
          <span className="font-medium text-gray-700">{label}</span>
          <StatusBadge status={sr.status} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex h-48 w-full items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50">
        <span className="text-xs text-gray-400">{sr.status === 'skipped' ? 'Skipped' : 'Pending'}</span>
      </div>
      <div className="flex items-center gap-2 text-[11px] text-gray-500">
        <span className="font-medium text-gray-700">{label}</span>
        <StatusBadge status={sr.status} />
      </div>
    </div>
  );
}

/* ---------- Step group card ---------- */

function StepGroupCard({
  group,
  defaultOpen,
  onViewPrompt,
}: {
  group: StepGroup;
  defaultOpen: boolean;
  onViewPrompt: (id: string, name: string | null, processed: string | null) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const isMulti = group.results.length > 1;
  const step = group.step;
  const representative = group.results[0];

  const completedCount = group.results.filter((r) => r.status === 'completed').length;
  const failedCount = group.results.filter((r) => r.status === 'failed').length;
  const runningCount = group.results.filter((r) => r.status === 'running').length;

  const groupStatus = runningCount > 0
    ? 'running'
    : failedCount === group.results.length
      ? 'failed'
      : completedCount > 0
        ? 'completed'
        : group.results[0]?.status ?? 'pending';

  const statusDot: Record<string, string> = {
    pending: 'bg-gray-300',
    running: 'bg-blue-400 animate-pulse',
    completed: 'bg-green-500',
    failed: 'bg-red-500',
    skipped: 'bg-amber-400',
  };

  const totalTime = group.results.reduce((sum, r) => sum + (r.executionTime ?? 0), 0);

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xs">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50"
      >
        <ChevronIcon open={open} />
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${statusDot[groupStatus] ?? statusDot.pending}`} />
        <span className="text-sm font-semibold text-gray-900">{group.name}</span>
        {isMulti && (
          <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
            &times;{group.results.length}
          </span>
        )}
        <span className="text-xs text-gray-500">{group.model}</span>
        {step?.promptVersion && (
          <span className="hidden text-xs text-gray-400 sm:inline">
            · {step.promptVersion.name || 'Untitled prompt'}
          </span>
        )}
        <span className="ml-auto flex items-center gap-2">
          {totalTime > 0 && (
            <span className="text-xs tabular-nums text-gray-400">{(totalTime / 1000).toFixed(1)}s</span>
          )}
          <StatusBadge status={groupStatus} />
        </span>
      </button>

      {open && (
        <div className="border-t border-gray-200">
          <div className="p-4">
            {/* Step-from badges */}
            {(step?.dollhouseViewFromStep || step?.realPhotoFromStep || step?.moodBoardFromStep) && (
              <div className="mb-3 flex flex-wrap gap-2">
                {step.dollhouseViewFromStep && (
                  <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-600/20 ring-inset">
                    Dollhouse View &larr; Step {step.dollhouseViewFromStep}
                  </span>
                )}
                {step.realPhotoFromStep && (
                  <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-600/20 ring-inset">
                    Real Photo &larr; Step {step.realPhotoFromStep}
                  </span>
                )}
                {step.moodBoardFromStep && (
                  <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-600/20 ring-inset">
                    Mood Board &larr; Step {step.moodBoardFromStep}
                  </span>
                )}
              </div>
            )}

            {/* Prompt link */}
            {step?.promptVersion && (
              <div className="mb-3 flex items-center gap-3 text-xs">
                <span className="text-gray-500">Prompt:</span>
                <Link href={`/prompt-versions/${step.promptVersion.id}`} className="text-primary-600 hover:text-primary-500 font-medium">
                  {step.promptVersion.name || 'Untitled'}
                </Link>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewPrompt(step.promptVersion!.id, step.promptVersion!.name, representative?.processedUserPrompt ?? null);
                  }}
                  className="text-gray-500 underline hover:text-gray-700"
                >
                  View prompt
                </button>
              </div>
            )}

            {/* Multiple executions of the same step */}
            {isMulti ? (
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  {group.results.length} generations from this step
                </p>
                <div className={`grid gap-3 ${group.results.length === 2 ? 'grid-cols-2' : group.results.length === 3 ? 'grid-cols-3' : 'grid-cols-2 lg:grid-cols-4'}`}>
                  {group.results.map((sr, i) => (
                    <GenerationTile key={sr.id} sr={sr} index={i} total={group.results.length} isSelected={sr.isJudgeSelected} />
                  ))}
                </div>
              </div>
            ) : (
              /* Single result */
              (() => {
                const sr = representative;
                if (!sr) return <p className="py-4 text-sm text-gray-400">No results</p>;
                if (sr.status === 'completed' && sr.outputUrl) {
                  return (
                    <div>
                      <ExpandableImage
                        src={sr.outputUrl}
                        alt={`${group.name} output`}
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
                  );
                }
                if (sr.status === 'failed') {
                  return (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                      <p className="text-sm font-medium text-red-700">Step failed</p>
                      {sr.error && <p className="mt-1 text-sm text-red-600">{sr.error}</p>}
                    </div>
                  );
                }
                if (sr.status === 'skipped') {
                  return (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                      <p className="text-sm font-medium text-amber-700">Step skipped</p>
                      {sr.error && <p className="mt-1 text-sm text-amber-600">{sr.error}</p>}
                    </div>
                  );
                }
                if (sr.status === 'running') {
                  return (
                    <div className="flex items-center gap-2 py-4">
                      <svg className="h-5 w-5 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span className="text-sm text-gray-600">Running...</span>
                    </div>
                  );
                }
                return <p className="py-4 text-sm text-gray-400">Pending</p>;
              })()
            )}
          </div>

          {/* Audit for first result (representative) */}
          {representative && <StepAudit sr={representative} />}
        </div>
      )}
    </div>
  );
}

/* ---------- Main component ---------- */

export function RunDetail({ strategyId, runId, initialData }: { strategyId: string; runId: string; initialData: RunData }) {
  const [data, setData] = useState<RunData>(initialData);
  const [retrying, setRetrying] = useState(false);
  const [markingStatus, setMarkingStatus] = useState<'idle' | 'failed' | 'completed'>('idle');
  const [viewingPromptId, setViewingPromptId] = useState<string | null>(null);
  const [viewingPromptName, setViewingPromptName] = useState<string | null>(null);
  const [viewingProcessedPrompt, setViewingProcessedPrompt] = useState<string | null>(null);
  const [showJudgeModal, setShowJudgeModal] = useState(false);

  const [showExecFlow, setShowExecFlow] = useState(false);
  const [showJudge, setShowJudge] = useState(true);
  const [showSteps, setShowSteps] = useState(true);

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

  const stepGroups = groupStepResults(sorted);

  const dagSteps: DagStep[] = stepGroups
    .filter((g) => g.step)
    .map((g) => {
      const anyCompleted = g.results.some((r) => r.status === 'completed');
      const anyRunning = g.results.some((r) => r.status === 'running');
      const anyFailed = g.results.some((r) => r.status === 'failed');
      const status = anyRunning ? 'running' : anyCompleted ? 'completed' : anyFailed ? 'failed' : (g.results[0]?.status as DagStep['status']) ?? 'pending';
      return {
        stepOrder: g.stepOrder,
        label: g.name,
        model: g.step!.model,
        aspectRatio: g.step!.aspectRatio,
        outputResolution: g.step!.outputResolution,
        temperature: g.step!.temperature,
        promptName: g.step!.promptVersion?.name,
        dollhouseViewFromStep: g.step!.dollhouseViewFromStep,
        realPhotoFromStep: g.step!.realPhotoFromStep,
        moodBoardFromStep: g.step!.moodBoardFromStep,
        status,
        error: g.results.find((r) => r.error)?.error ?? null,
      };
    });

  const dagJudges = [...new Map(
    data.judgeResults.map((j) => [j.strategyJudgeId, j])
  ).values()]
    .sort((a, b) => a.position - b.position)
    .map((j) => ({
      name: j.judgeName,
      type: j.judgeType,
      model: j.judgeModel,
      promptName: j.judgePromptVersionName,
      position: j.position,
    }));

  const duration = data.completedAt
    ? Math.round((new Date(data.completedAt).getTime() - new Date(data.createdAt).getTime()) / 1000)
    : null;

  const completedSteps = sorted.filter((s) => s.status === 'completed').length;
  const hasJudgeInfo = data.judgeResults.length > 0 || data.judgeReasoning || data.judgeSystemPrompt || data.judgeUserPrompt;
  const hasConfig = data.strategy.model != null || data.strategy.aspectRatio != null;

  const handleViewPrompt = useCallback((id: string, name: string | null, processed: string | null) => {
    setViewingPromptId(id);
    setViewingPromptName(name);
    setViewingProcessedPrompt(processed);
  }, []);

  return (
    <div>
      <PageHeader
        backHref={`/strategies/${strategyId}`}
        backLabel={`Back to ${data.strategy.name}`}
        title="Strategy Run"
        subtitle={`${data.strategy.name} · ${new Date(data.createdAt).toLocaleString()}`}
      />

      {/* ──── Summary card ──── */}
      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-5 shadow-xs">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          {/* Status + source */}
          <div className="flex items-center gap-2">
            <StatusBadge status={data.status} />
            <SourceBadge source={data.source} />
          </div>

          {/* Timing */}
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>Created {new Date(data.createdAt).toLocaleString()}</span>
            {duration != null && (
              <span className="flex items-center gap-1">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                {duration >= 60 ? `${Math.floor(duration / 60)}m ${duration % 60}s` : `${duration}s`}
              </span>
            )}
            <span>{stepGroups.length} {stepGroups.length === 1 ? 'step' : 'steps'} · {sorted.length} {sorted.length === 1 ? 'generation' : 'generations'}</span>
          </div>

          {/* Judge score */}
          {data.judgeScore != null && data.judgeScore > 0 && (
            <button
              type="button"
              onClick={() => setShowJudgeModal(true)}
              className={`ml-auto inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${data.isJudgeSelected ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              {data.isJudgeSelected && (
                <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              )}
              Score: {data.judgeScore}
            </button>
          )}
          {(data.judgeScore === 0 || (data.strategy.hasJudge && data.status === 'completed' && sorted.some((sr) => sr.outputUrl) && data.judgeScore == null)) && (
            <button
              type="button"
              onClick={() => setShowJudgeModal(true)}
              className="ml-auto inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-800 transition-colors hover:bg-red-200"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" /></svg>
              Judge failed
            </button>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2">
            {data.status !== 'failed' && data.status !== 'skipped' && (
              <button
                type="button"
                onClick={() => handleMarkStatus('failed')}
                disabled={markingStatus !== 'idle'}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50"
              >
                {markingStatus === 'failed' && <Spinner />}
                Mark failed
              </button>
            )}
            {(data.status === 'failed' || data.status === 'skipped') && (
              <>
                <button
                  type="button"
                  onClick={() => handleMarkStatus('completed')}
                  disabled={markingStatus !== 'idle'}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-50"
                >
                  {markingStatus === 'completed' && <Spinner />}
                  Mark completed
                </button>
                <button
                  type="button"
                  onClick={handleRetry}
                  disabled={retrying}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100 disabled:opacity-50"
                >
                  {retrying ? <Spinner /> : (
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                    </svg>
                  )}
                  Retry
                </button>
              </>
            )}
          </div>
        </div>

        {hasConfig && (
          <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-4">
            {data.strategy.model != null && <ConfigTag label="Model" value={data.strategy.model} />}
            {data.strategy.aspectRatio != null && <ConfigTag label="Aspect" value={data.strategy.aspectRatio} />}
            {data.strategy.outputResolution != null && <ConfigTag label="Resolution" value={data.strategy.outputResolution} />}
            {data.strategy.temperature != null && <ConfigTag label="Temp" value={String(data.strategy.temperature)} />}
            {data.strategy.tagImages != null && <ConfigTag label="Tag images" value={data.strategy.tagImages ? 'Yes' : 'No'} />}
            {data.strategy.useGoogleSearch != null && <ConfigTag label="Google Search" value={data.strategy.useGoogleSearch ? 'Yes' : 'No'} />}
          </div>
        )}
      </div>

      {/* ──── Skipped reasons ──── */}
      {data.status === 'skipped' && (() => {
        const reasons = sorted
          .filter((sr) => sr.status === 'skipped' && sr.error)
          .map((sr) => ({ step: sr.step?.name ?? `Step ${sr.step?.stepOrder}`, reason: sr.error! }));
        if (reasons.length === 0) return null;
        return (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-medium text-amber-800">Why this run was skipped</p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-amber-700">
              {reasons.map(({ step, reason }, i) => (
                <li key={i}><span className="font-medium">{step}:</span> {reason}</li>
              ))}
            </ul>
          </div>
        );
      })()}

      {/* ──── Collapsible sections ──── */}
      <div className="mt-6 space-y-4">
        {/* Execution Flow */}
        {dagSteps.length > 0 && (
          <SectionToggle title="Execution Flow" open={showExecFlow} onToggle={() => setShowExecFlow(!showExecFlow)}>
            <div className="p-4">
              <StrategyFlowDag steps={dagSteps} judges={dagJudges} />
            </div>
          </SectionToggle>
        )}

        {/* Judge Evaluation */}
        {hasJudgeInfo && (
          <SectionToggle
            title="Judge Evaluation"
            open={showJudge}
            onToggle={() => setShowJudge(!showJudge)}
            count={data.judgeResults.length || undefined}
            badge={data.judgeScore != null && data.judgeScore > 0 ? (
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${data.isJudgeSelected ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                Score: {data.judgeScore}
              </span>
            ) : undefined}
          >
            <div className="space-y-4 p-4">
              {/* Per-judge evaluations */}
              {data.judgeResults.length > 0 && (
                <RunJudgeEvaluationsSection judgeResults={data.judgeResults} />
              )}

              {/* Aggregate judge reasoning (skip when single judge row already shows it) */}
              {data.judgeResults.length !== 1 && data.judgeReasoning && (() => {
                const isFailed = data.judgeScore === 0;
                return (
                  <div className={`rounded-lg border p-4 ${isFailed ? 'border-red-200 bg-red-50' : 'border-indigo-200 bg-indigo-50'}`}>
                    <p className={`text-sm font-medium ${isFailed ? 'text-red-800' : 'text-indigo-800'}`}>
                      {isFailed ? 'Judge Error' : 'Judge Reasoning'}
                      {data.judgeScore != null && data.judgeScore > 0 && (
                        <span className="ml-2 font-normal text-indigo-600">
                          (Score: {data.judgeScore}{data.isJudgeSelected ? ' — Selected' : ''})
                        </span>
                      )}
                    </p>
                    <p className={`mt-2 text-sm ${isFailed ? 'text-red-700' : 'text-indigo-700'}`}>{data.judgeReasoning}</p>
                  </div>
                );
              })()}

              {/* Judge output */}
              {data.judgeResults.length !== 1 && data.judgeOutput && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <p className="text-sm font-medium text-gray-800">Judge Output</p>
                  <pre className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-gray-700">{data.judgeOutput}</pre>
                </div>
              )}

              {/* Legacy single-judge audit */}
              {data.judgeResults.length === 0 && (data.judgeSystemPrompt || data.judgeUserPrompt || data.judgeInputImages) && (
                <div className="space-y-3">
                  {data.judgeTypeUsed && (
                    <div>
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Judge Mode</p>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        data.judgeTypeUsed === 'batch' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'
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
              )}
            </div>
          </SectionToggle>
        )}

        {/* Step Results */}
        <SectionToggle
          title="Step Results"
          count={stepGroups.length}
          open={showSteps}
          onToggle={() => setShowSteps(!showSteps)}
        >
          <div className="space-y-3 p-4">
            {stepGroups.length === 0 && (
              <p className="text-sm text-gray-500">No step results yet.</p>
            )}
            {stepGroups.map((group, i) => (
              <StepGroupCard
                key={group.stepOrder}
                group={group}
                defaultOpen={stepGroups.length <= 3 || i === stepGroups.length - 1}
                onViewPrompt={handleViewPrompt}
              />
            ))}
          </div>
        </SectionToggle>
      </div>

      {/* ──── Modals ──── */}
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
          isSelected={data.isJudgeSelected}
          isFailed={data.judgeScore === 0}
          onClose={() => setShowJudgeModal(false)}
        />
      )}

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

/* ---------- tiny helpers ---------- */

function Spinner() {
  return (
    <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function ConfigTag({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-700">
      <span className="font-medium text-gray-500">{label}:</span>&nbsp;{value}
    </span>
  );
}
