'use client';

import { ExpandableImage } from '@/components/expandable-image';
import { serviceUrl } from '@/lib/api-base';
import { withImageParams } from '@/lib/image-utils';
import Link from 'next/link';
import { useEffect, useState } from 'react';

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
  processedUserPrompt: string | null;
  processedSystemPrompt: string | null;
  inputImages: InputImage[] | null;
  requestConfig: Record<string, unknown> | null;
  step: {
    stepOrder: number;
    name: string | null;
    model: string;
  } | null;
}

interface RunData {
  id: string;
  status: string;
  createdAt: string;
  source: string | null;
  judgeScore: number | null;
  isJudgeSelected: boolean;
  judgeReasoning: string | null;
  judgeSystemPrompt: string | null;
  judgeUserPrompt: string | null;
  judgeInputImages: InputImage[] | null;
  strategy: {
    id: string;
    name: string;
  };
  stepResults: StepResult[];
}

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

function SectionHeader({ title }: { title: string }) {
  return <h3 className="border-b border-gray-200 pb-2 text-sm font-semibold text-gray-800">{title}</h3>;
}

function ImageGrid({ images }: { images: InputImage[] }) {
  const [expandedGroup, setExpandedGroup] = useState<number | null>(null);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
        {images.map((img, i) => (
          <div key={i}>
            <div
              className={`aspect-square overflow-hidden rounded-md border bg-gray-50 ${img.isComposite ? 'border-violet-400 ring-1 ring-violet-200 cursor-pointer' : 'border-gray-200'}`}
              {...(img.isComposite ? { onClick: () => setExpandedGroup(expandedGroup === i ? null : i) } : {})}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={withImageParams(img.url)} alt={img.label} className="h-full w-full object-cover" loading="lazy" />
            </div>
            <div className="mt-0.5 flex items-center gap-1">
              {img.isComposite && (
                <span className="inline-flex shrink-0 items-center rounded bg-violet-100 px-1 py-px text-[9px] font-semibold text-violet-700">
                  Group
                </span>
              )}
              <p className="truncate text-[10px] text-gray-500" title={img.label}>{img.label}</p>
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
                <div className="aspect-square overflow-hidden rounded-md border border-violet-200 bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={withImageParams(src.url)} alt={src.label} className="h-full w-full object-cover" loading="lazy" />
                </div>
                <p className="mt-0.5 truncate text-[10px] text-violet-700" title={src.label}>{src.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function SingleRunAuditView({ runId }: { runId: string }) {
  const [run, setRun] = useState<RunData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(serviceUrl(`strategy-runs/${runId}`), { cache: 'no-store' });
        if (!res.ok) {
          setError(`Failed to load: ${res.status}`);
          return;
        }
        const json = await res.json();
        setRun(json.data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [runId]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <svg className="h-6 w-6 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (error || !run) {
    return (
      <div className="flex h-64 flex-col items-center justify-center text-red-600">
        <p className="font-medium">Error loading run</p>
        <p className="mt-1 text-sm">{error ?? 'Run not found'}</p>
      </div>
    );
  }

  const steps = [...run.stepResults].sort((a, b) => (a.step?.stepOrder ?? 0) - (b.step?.stepOrder ?? 0));

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Run Audit</h2>
        <Link
          href={`/strategies/${run.strategy.id}/runs/${run.id}`}
          className="text-xs text-primary-600 hover:text-primary-500"
        >
          View run detail &rarr;
        </Link>
      </div>

      {/* Run header */}
      <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">{run.strategy.name}</p>
            <p className="mt-0.5 text-xs text-gray-500">{new Date(run.createdAt).toLocaleString()}</p>
            <p className="mt-0.5 font-mono text-[10px] text-gray-400">{run.id}</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${run.status === 'completed' ? 'bg-green-100 text-green-700' : run.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
              {run.status}
            </span>
            {run.source && (
              <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                {SOURCE_LABELS[run.source] ?? run.source}
              </span>
            )}
            {run.judgeScore != null && (
              <span className="inline-flex rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-medium text-indigo-700">
                Judge: {run.judgeScore}{run.isJudgeSelected ? ' (Selected)' : ''}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="mt-6 space-y-6">
        {steps.map((sr, i) => {
          const stepName = sr.step?.name ?? `Step ${sr.step?.stepOrder ?? i + 1}`;
          const hasAudit = sr.processedSystemPrompt || sr.processedUserPrompt || sr.inputImages || sr.requestConfig;

          return (
            <div key={sr.id} className="rounded-lg border border-gray-200 bg-white shadow-xs">
              <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3">
                <span className="text-sm font-semibold text-gray-800">{stepName}</span>
                <div className="flex items-center gap-2">
                  {sr.executionTime != null && (
                    <span className="text-[10px] text-gray-500">{(sr.executionTime / 1000).toFixed(1)}s</span>
                  )}
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${sr.status === 'completed' ? 'bg-green-100 text-green-700' : sr.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                    {sr.status}
                  </span>
                </div>
              </div>

              <div className="space-y-4 p-4">
                {sr.requestConfig && (
                  <div>
                    <SectionHeader title="Request Config" />
                    <div className="mt-2 flex flex-wrap gap-1.5">
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
                    <SectionHeader title="System Prompt" />
                    <pre className="mt-2 max-h-64 overflow-auto rounded-md border border-gray-200 bg-gray-50 p-2 text-xs leading-relaxed text-gray-700 whitespace-pre-wrap">{sr.processedSystemPrompt}</pre>
                  </div>
                )}

                {sr.processedUserPrompt && (
                  <div>
                    <SectionHeader title="User Prompt" />
                    <pre className="mt-2 max-h-64 overflow-auto rounded-md border border-gray-200 bg-gray-50 p-2 text-xs leading-relaxed text-gray-700 whitespace-pre-wrap">{sr.processedUserPrompt}</pre>
                  </div>
                )}

                {sr.inputImages && sr.inputImages.length > 0 && (
                  <div>
                    <SectionHeader title={`Input Images (${sr.inputImages.length})`} />
                    <div className="mt-2">
                      <ImageGrid images={sr.inputImages} />
                    </div>
                  </div>
                )}

                {sr.outputUrl && (
                  <div>
                    <SectionHeader title="Output" />
                    <div className="mt-2">
                      <ExpandableImage
                        src={withImageParams(sr.outputUrl, 1024)}
                        alt={`${stepName} output`}
                        wrapperClassName="relative block h-64 w-full max-w-xl rounded-lg border border-gray-200 bg-gray-50"
                      />
                    </div>
                  </div>
                )}

                {sr.error && (
                  <div className="rounded-md border border-red-200 bg-red-50 p-2">
                    <p className="text-xs text-red-700">{sr.error}</p>
                  </div>
                )}

                {!hasAudit && !sr.outputUrl && !sr.error && (
                  <p className="text-xs text-gray-400">No audit data for this step.</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Judge audit */}
      {(run.judgeScore != null || run.judgeSystemPrompt || run.judgeUserPrompt || run.judgeInputImages) && (
        <div className="mt-6 rounded-lg border border-indigo-200 bg-white shadow-xs">
          <div className="border-b border-indigo-200 bg-indigo-50 px-4 py-3">
            <span className="text-sm font-semibold text-indigo-800">Judge</span>
          </div>
          <div className="space-y-4 p-4">
            {run.judgeScore != null && (
              <div className="rounded-md bg-gray-50 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Score</p>
                <p className="mt-1 text-lg font-bold text-gray-800">{run.judgeScore}</p>
                {run.isJudgeSelected && <p className="text-xs text-amber-600">Selected</p>}
                {run.judgeReasoning && <p className="mt-1 text-xs text-gray-600">{run.judgeReasoning}</p>}
              </div>
            )}

            {run.judgeSystemPrompt && (
              <div>
                <SectionHeader title="Judge System Prompt" />
                <pre className="mt-2 max-h-64 overflow-auto rounded-md border border-gray-200 bg-gray-50 p-2 text-xs leading-relaxed text-gray-700 whitespace-pre-wrap">{run.judgeSystemPrompt}</pre>
              </div>
            )}

            {run.judgeUserPrompt && (
              <div>
                <SectionHeader title="Judge User Prompt" />
                <pre className="mt-2 max-h-64 overflow-auto rounded-md border border-gray-200 bg-gray-50 p-2 text-xs leading-relaxed text-gray-700 whitespace-pre-wrap">{run.judgeUserPrompt}</pre>
              </div>
            )}

            {run.judgeInputImages && run.judgeInputImages.length > 0 && (
              <div>
                <SectionHeader title={`Judge Input Images (${run.judgeInputImages.length})`} />
                <div className="mt-2">
                  <ImageGrid images={run.judgeInputImages} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
