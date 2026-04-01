'use client';

import { ExpandableImage } from '@/components/expandable-image';
import { serviceUrl } from '@/lib/api-base';
import { withImageParams } from '@/lib/image-utils';
import { parseStrategyRunJudgeResults, type StrategyRunJudgeResultEntry } from '@/lib/service-client';
import { diffWords, type Change } from 'diff';
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
  judgeOutput: string | null;
  judgeSystemPrompt: string | null;
  judgeUserPrompt: string | null;
  judgeInputImages: InputImage[] | null;
  judgeResults: StrategyRunJudgeResultEntry[];
  strategy: {
    id: string;
    name: string;
  };
  stepResults: StepResult[];
}

const SOURCE_LABELS: Record<string, string> = {
  preset: 'Preset Run',
  raw_input: 'Real Input',
  batch: 'Batch Run',
  retry: 'Preset Run',
};

const CONFIG_LABELS: Record<string, string> = {
  model: 'Model',
  aspect_ratio: 'Aspect Ratio',
  output_resolution: 'Resolution',
  temperature: 'Temperature',
  use_google_search: 'Google Search',
  tag_images: 'Tag Images',
};

function DiffText({ left, right }: { left: string; right: string }) {
  if (left === right) {
    return <pre className="max-h-64 overflow-auto rounded-md border border-gray-200 bg-gray-50 p-2 text-xs leading-relaxed text-gray-700 whitespace-pre-wrap">{left}</pre>;
  }

  const changes: Change[] = diffWords(left, right);

  return (
    <div className="grid grid-cols-2 gap-2">
      <pre className="max-h-64 overflow-auto rounded-md border border-red-200 bg-red-50/30 p-2 text-xs leading-relaxed text-gray-700 whitespace-pre-wrap">
        {changes.map((c, i) =>
          c.added ? null : (
            <span key={i} className={c.removed ? 'bg-red-200 text-red-900' : ''}>{c.value}</span>
          ),
        )}
      </pre>
      <pre className="max-h-64 overflow-auto rounded-md border border-green-200 bg-green-50/30 p-2 text-xs leading-relaxed text-gray-700 whitespace-pre-wrap">
        {changes.map((c, i) =>
          c.removed ? null : (
            <span key={i} className={c.added ? 'bg-green-200 text-green-900' : ''}>{c.value}</span>
          ),
        )}
      </pre>
    </div>
  );
}

function orderedJudgeIds(left: StrategyRunJudgeResultEntry[], right: StrategyRunJudgeResultEntry[]): string[] {
  const byId = new Map<string, number>();
  for (const j of left) {
    const p = j.position;
    if (!byId.has(j.strategyJudgeId) || p < byId.get(j.strategyJudgeId)!) byId.set(j.strategyJudgeId, p);
  }
  for (const j of right) {
    const p = j.position;
    if (!byId.has(j.strategyJudgeId) || p < byId.get(j.strategyJudgeId)!) byId.set(j.strategyJudgeId, p);
  }
  return [...byId.entries()].sort((a, b) => a[1] - b[1]).map(([id]) => id);
}

function ConfigDiff({ left, right }: { left: Record<string, unknown> | null; right: Record<string, unknown> | null }) {
  const allKeys = [...new Set([...Object.keys(left ?? {}), ...Object.keys(right ?? {})])];
  if (allKeys.length === 0) return <p className="text-xs text-gray-400">No config data</p>;

  return (
    <div className="space-y-1">
      {allKeys.map((key) => {
        const lv = String((left ?? {})[key] ?? '');
        const rv = String((right ?? {})[key] ?? '');
        const changed = lv !== rv;
        return (
          <div key={key} className={`flex items-center gap-2 rounded px-2 py-0.5 text-[11px] ${changed ? 'bg-amber-50 ring-1 ring-amber-200' : 'bg-gray-50'}`}>
            <span className="w-28 shrink-0 font-medium text-gray-500">{CONFIG_LABELS[key] ?? key}</span>
            {changed ? (
              <>
                <span className="rounded bg-red-100 px-1 text-red-700 line-through">{lv || '(none)'}</span>
                <span className="text-gray-400">&rarr;</span>
                <span className="rounded bg-green-100 px-1 text-green-700">{rv || '(none)'}</span>
              </>
            ) : (
              <span className="text-gray-700">{lv}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ImageCompare({ left, right }: { left: InputImage[] | null; right: InputImage[] | null }) {
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const leftImgs = left ?? [];
  const rightImgs = right ?? [];
  const maxLen = Math.max(leftImgs.length, rightImgs.length);

  if (maxLen === 0) return <p className="text-xs text-gray-400">No input images</p>;

  const leftByLabel = new Map(leftImgs.map((img) => [img.label, img]));
  const rightByLabel = new Map(rightImgs.map((img) => [img.label, img]));
  const allLabels = [...new Set([...leftImgs.map((i) => i.label), ...rightImgs.map((i) => i.label)])];

  return (
    <div className="space-y-2">
      {allLabels.map((label) => {
        const lImg = leftByLabel.get(label);
        const rImg = rightByLabel.get(label);
        const same = lImg?.url === rImg?.url;
        const isComposite = lImg?.isComposite || rImg?.isComposite;
        const sourceImages = lImg?.sourceImages ?? rImg?.sourceImages;
        return (
          <div key={label}>
            <div
              className={`flex items-start gap-3 rounded-lg p-2 ${same ? 'bg-gray-50' : 'bg-amber-50 ring-1 ring-amber-200'} ${isComposite ? 'cursor-pointer' : ''}`}
              {...(isComposite ? { onClick: () => setExpandedGroup(expandedGroup === label ? null : label) } : {})}
            >
              <div className="w-28 shrink-0 pt-1">
                <p className="text-[10px] font-medium text-gray-500">{label}</p>
                {isComposite && (
                  <span className="mt-0.5 inline-flex items-center rounded bg-violet-100 px-1 py-px text-[9px] font-semibold text-violet-700">
                    Group
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 flex-1">
                <div className={`aspect-square w-20 overflow-hidden rounded-md border bg-gray-100 ${isComposite ? 'border-violet-400' : 'border-gray-200'}`}>
                  {lImg?.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={withImageParams(lImg.url)} alt={label} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[10px] text-gray-400">N/A</div>
                  )}
                </div>
                <div className={`aspect-square w-20 overflow-hidden rounded-md border bg-gray-100 ${isComposite ? 'border-violet-400' : 'border-gray-200'}`}>
                  {rImg?.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={withImageParams(rImg.url)} alt={label} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[10px] text-gray-400">N/A</div>
                  )}
                </div>
              </div>
              {!same && <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">Changed</span>}
            </div>

            {expandedGroup === label && sourceImages && (
              <div className="mt-1 ml-[7.5rem] rounded-lg border border-violet-200 bg-violet-50 p-3">
                <p className="mb-2 text-xs font-semibold text-violet-800">{sourceImages.length} source images</p>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {sourceImages.map((src, j) => (
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
      })}
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <h3 className="border-b border-gray-200 pb-2 text-sm font-semibold text-gray-800">{title}</h3>;
}

function RunHeader({ run, label }: { run: RunData; label: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</p>
      <p className="mt-1 text-sm font-medium text-gray-900">{run.strategy.name}</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${run.status === 'completed' ? 'bg-green-100 text-green-700' : run.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
          {run.status}
        </span>
        {run.source && (
          <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">
            {SOURCE_LABELS[run.source] ?? run.source}
          </span>
        )}
        {run.judgeScore != null && (
          <span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-medium text-indigo-700">
            Judge: {run.judgeScore}
          </span>
        )}
      </div>
      <p className="mt-1 text-[10px] text-gray-500">{new Date(run.createdAt).toLocaleString()}</p>
      <p className="mt-0.5 font-mono text-[10px] text-gray-400">{run.id}</p>
    </div>
  );
}

export function CompareView({ leftId, rightId }: { leftId: string; rightId: string }) {
  const [left, setLeft] = useState<RunData | null>(null);
  const [right, setRight] = useState<RunData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(serviceUrl(`strategy-runs/compare?left=${leftId}&right=${rightId}`), { cache: 'no-store' });
        if (!res.ok) {
          setError(`Failed to load: ${res.status}`);
          return;
        }
        const json = await res.json();
        const rawL = json.data.left as Record<string, unknown>;
        const rawR = json.data.right as Record<string, unknown>;
        setLeft({
          ...(json.data.left as RunData),
          judgeResults: parseStrategyRunJudgeResults(rawL.judgeResults),
        });
        setRight({
          ...(json.data.right as RunData),
          judgeResults: parseStrategyRunJudgeResults(rawR.judgeResults),
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [leftId, rightId]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <svg className="h-6 w-6 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (error || !left || !right) {
    return (
      <div className="flex h-96 flex-col items-center justify-center text-red-600">
        <p className="font-medium">Error loading runs</p>
        <p className="mt-1 text-sm">{error ?? 'One or both runs not found'}</p>
      </div>
    );
  }

  const leftSteps = [...left.stepResults].sort((a, b) => (a.step?.stepOrder ?? 0) - (b.step?.stepOrder ?? 0));
  const rightSteps = [...right.stepResults].sort((a, b) => (a.step?.stepOrder ?? 0) - (b.step?.stepOrder ?? 0));
  const maxSteps = Math.max(leftSteps.length, rightSteps.length);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Compare Runs</h1>
        <div className="flex gap-2">
          <Link href={`/strategies/${left.strategy.id}/runs/${left.id}`} className="text-xs text-primary-600 hover:text-primary-500">
            View left run &rarr;
          </Link>
          <Link href={`/strategies/${right.strategy.id}/runs/${right.id}`} className="text-xs text-primary-600 hover:text-primary-500">
            View right run &rarr;
          </Link>
        </div>
      </div>

      {/* Run headers */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        <RunHeader run={left} label="Left" />
        <RunHeader run={right} label="Right" />
      </div>

      {/* Step-by-step comparison */}
      <div className="mt-8 space-y-8">
        {Array.from({ length: maxSteps }, (_, i) => {
          const ls = leftSteps[i] ?? null;
          const rs = rightSteps[i] ?? null;
          const stepName = ls?.step?.name ?? rs?.step?.name ?? `Step ${i + 1}`;

          return (
            <div key={i} className="rounded-lg border border-gray-200 bg-white shadow-xs">
              <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
                <span className="text-sm font-semibold text-gray-800">{stepName}</span>
              </div>

              <div className="space-y-4 p-4">
                {/* Config comparison */}
                <div>
                  <SectionHeader title="Request Config" />
                  <div className="mt-2">
                    <ConfigDiff left={ls?.requestConfig ?? null} right={rs?.requestConfig ?? null} />
                  </div>
                </div>

                {/* System prompt comparison */}
                {(ls?.processedSystemPrompt || rs?.processedSystemPrompt) && (
                  <div>
                    <SectionHeader title="System Prompt" />
                    <div className="mt-2">
                      <DiffText
                        left={ls?.processedSystemPrompt ?? ''}
                        right={rs?.processedSystemPrompt ?? ''}
                      />
                    </div>
                  </div>
                )}

                {/* User prompt comparison */}
                {(ls?.processedUserPrompt || rs?.processedUserPrompt) && (
                  <div>
                    <SectionHeader title="User Prompt" />
                    <div className="mt-2">
                      <DiffText
                        left={ls?.processedUserPrompt ?? ''}
                        right={rs?.processedUserPrompt ?? ''}
                      />
                    </div>
                  </div>
                )}

                {/* Input images */}
                {(ls?.inputImages || rs?.inputImages) && (
                  <div>
                    <SectionHeader title="Input Images" />
                    <div className="mt-2">
                      <ImageCompare left={ls?.inputImages ?? null} right={rs?.inputImages ?? null} />
                    </div>
                  </div>
                )}

                {/* Output images */}
                {(ls?.outputUrl || rs?.outputUrl) && (
                  <div>
                    <SectionHeader title="Output" />
                    <div className="mt-2 grid grid-cols-2 gap-4">
                      <div>
                        {ls?.outputUrl ? (
                          <ExpandableImage src={withImageParams(ls.outputUrl, 1024)} alt="Left output" wrapperClassName="relative block h-64 w-full rounded-lg border border-gray-200 bg-gray-50" />
                        ) : (
                          <div className="flex h-64 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-400">No output</div>
                        )}
                        {ls?.executionTime && <p className="mt-1 text-[10px] text-gray-500">{(ls.executionTime / 1000).toFixed(1)}s</p>}
                      </div>
                      <div>
                        {rs?.outputUrl ? (
                          <ExpandableImage src={withImageParams(rs.outputUrl, 1024)} alt="Right output" wrapperClassName="relative block h-64 w-full rounded-lg border border-gray-200 bg-gray-50" />
                        ) : (
                          <div className="flex h-64 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-400">No output</div>
                        )}
                        {rs?.executionTime && <p className="mt-1 text-[10px] text-gray-500">{(rs.executionTime / 1000).toFixed(1)}s</p>}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Judge comparison */}
      {((left.judgeResults.length > 0 || right.judgeResults.length > 0) ||
        left.judgeScore != null ||
        right.judgeScore != null ||
        left.judgeSystemPrompt ||
        right.judgeSystemPrompt ||
        left.judgeReasoning ||
        right.judgeReasoning ||
        left.judgeOutput ||
        right.judgeOutput) && (
        <div className="mt-8 space-y-6">
          {(left.judgeResults.length > 0 || right.judgeResults.length > 0) && (
            <>
              {!(left.judgeResults.length === 1 && right.judgeResults.length === 1) && (
                <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-900">Aggregated (average)</h3>
                  <div className="mt-2 grid grid-cols-2 gap-4">
                    <div className="rounded-md bg-white p-3 ring-1 ring-amber-200/60">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Left score</p>
                      <p className="mt-1 text-lg font-bold text-gray-800">{left.judgeScore ?? 'N/A'}</p>
                      {left.isJudgeSelected && <p className="text-xs text-amber-600">Selected</p>}
                    </div>
                    <div className="rounded-md bg-white p-3 ring-1 ring-amber-200/60">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Right score</p>
                      <p className="mt-1 text-lg font-bold text-gray-800">{right.judgeScore ?? 'N/A'}</p>
                      {right.isJudgeSelected && <p className="text-xs text-amber-600">Selected</p>}
                    </div>
                  </div>
                  {(left.judgeReasoning || right.judgeReasoning) && (
                    <div className="mt-3">
                      <SectionHeader title="Aggregated reasoning" />
                      <div className="mt-2">
                        <DiffText left={left.judgeReasoning ?? ''} right={right.judgeReasoning ?? ''} />
                      </div>
                    </div>
                  )}
                  {(left.judgeOutput || right.judgeOutput) && (
                    <div className="mt-3">
                      <SectionHeader title="Aggregated parsed output" />
                      <div className="mt-2">
                        <DiffText left={left.judgeOutput ?? ''} right={right.judgeOutput ?? ''} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {orderedJudgeIds(left.judgeResults, right.judgeResults).map((judgeId) => {
                const lj = left.judgeResults.find((j) => j.strategyJudgeId === judgeId);
                const rj = right.judgeResults.find((j) => j.strategyJudgeId === judgeId);
                const name = lj?.judgeName || rj?.judgeName;
                const label = name || lj?.judgeModel || rj?.judgeModel || judgeId.slice(0, 8);
                return (
                  <div key={judgeId} className="rounded-lg border border-indigo-200 bg-white shadow-xs">
                    <div className="border-b border-indigo-200 bg-indigo-50 px-4 py-3">
                      <span className="text-sm font-semibold text-indigo-800">Judge: {label}</span>
                      <p className="mt-0.5 text-[11px] text-indigo-700/80">Matched by judge configuration ID</p>
                    </div>
                    <div className="space-y-4 p-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="rounded-md bg-gray-50 p-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Left raw score</p>
                          <p className="mt-1 text-lg font-bold text-gray-800">{lj?.judgeScore ?? 'N/A'}</p>
                        </div>
                        <div className="rounded-md bg-gray-50 p-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Right raw score</p>
                          <p className="mt-1 text-lg font-bold text-gray-800">{rj?.judgeScore ?? 'N/A'}</p>
                        </div>
                      </div>
                      {(lj?.judgeReasoning || rj?.judgeReasoning) && (
                        <div>
                          <SectionHeader title="Reasoning" />
                          <div className="mt-2">
                            <DiffText left={lj?.judgeReasoning ?? ''} right={rj?.judgeReasoning ?? ''} />
                          </div>
                        </div>
                      )}
                      {(lj?.judgeOutput || rj?.judgeOutput) && (
                        <div>
                          <SectionHeader title="Parsed output" />
                          <div className="mt-2">
                            <DiffText left={lj?.judgeOutput ?? ''} right={rj?.judgeOutput ?? ''} />
                          </div>
                        </div>
                      )}
                      {(lj?.judgeSystemPrompt || rj?.judgeSystemPrompt) && (
                        <div>
                          <SectionHeader title="System prompt" />
                          <div className="mt-2">
                            <DiffText left={lj?.judgeSystemPrompt ?? ''} right={rj?.judgeSystemPrompt ?? ''} />
                          </div>
                        </div>
                      )}
                      {(lj?.judgeUserPrompt || rj?.judgeUserPrompt) && (
                        <div>
                          <SectionHeader title="User prompt" />
                          <div className="mt-2">
                            <DiffText left={lj?.judgeUserPrompt ?? ''} right={rj?.judgeUserPrompt ?? ''} />
                          </div>
                        </div>
                      )}
                      {(lj?.judgeInputImages || rj?.judgeInputImages) && (
                        <div>
                          <SectionHeader title="Input images" />
                          <div className="mt-2">
                            <ImageCompare left={lj?.judgeInputImages ?? null} right={rj?.judgeInputImages ?? null} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {left.judgeResults.length === 0 && right.judgeResults.length === 0 && (
            <div className="rounded-lg border border-indigo-200 bg-white shadow-xs">
              <div className="border-b border-indigo-200 bg-indigo-50 px-4 py-3">
                <span className="text-sm font-semibold text-indigo-800">Judge</span>
              </div>

              <div className="space-y-4 p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-md bg-gray-50 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Score</p>
                    <p className="mt-1 text-lg font-bold text-gray-800">{left.judgeScore ?? 'N/A'}</p>
                    {left.isJudgeSelected && <p className="text-xs text-amber-600">Selected</p>}
                    {left.judgeReasoning && <p className="mt-1 text-xs text-gray-600">{left.judgeReasoning}</p>}
                  </div>
                  <div className="rounded-md bg-gray-50 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Score</p>
                    <p className="mt-1 text-lg font-bold text-gray-800">{right.judgeScore ?? 'N/A'}</p>
                    {right.isJudgeSelected && <p className="text-xs text-amber-600">Selected</p>}
                    {right.judgeReasoning && <p className="mt-1 text-xs text-gray-600">{right.judgeReasoning}</p>}
                  </div>
                </div>

                {(left.judgeOutput || right.judgeOutput) && (
                  <div>
                    <SectionHeader title="Judge parsed output" />
                    <div className="mt-2">
                      <DiffText left={left.judgeOutput ?? ''} right={right.judgeOutput ?? ''} />
                    </div>
                  </div>
                )}

                {(left.judgeSystemPrompt || right.judgeSystemPrompt) && (
                  <div>
                    <SectionHeader title="Judge System Prompt" />
                    <div className="mt-2">
                      <DiffText
                        left={left.judgeSystemPrompt ?? ''}
                        right={right.judgeSystemPrompt ?? ''}
                      />
                    </div>
                  </div>
                )}

                {(left.judgeUserPrompt || right.judgeUserPrompt) && (
                  <div>
                    <SectionHeader title="Judge User Prompt" />
                    <div className="mt-2">
                      <DiffText
                        left={left.judgeUserPrompt ?? ''}
                        right={right.judgeUserPrompt ?? ''}
                      />
                    </div>
                  </div>
                )}

                {(left.judgeInputImages || right.judgeInputImages) && (
                  <div>
                    <SectionHeader title="Judge Input Images" />
                    <div className="mt-2">
                      <ImageCompare left={left.judgeInputImages ?? null} right={right.judgeInputImages ?? null} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
