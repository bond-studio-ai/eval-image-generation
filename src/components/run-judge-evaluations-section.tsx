'use client';

import { withImageParams } from '@/lib/image-utils';
import type { StrategyRunJudgeResultEntry } from '@/lib/service-client';
import Link from 'next/link';
import { useState } from 'react';

function SectionHeader({ title }: { title: string }) {
  return <h4 className="border-b border-gray-200 pb-1.5 text-xs font-semibold text-gray-800">{title}</h4>;
}

function JudgeCard({ j }: { j: StrategyRunJudgeResultEntry }) {
  const [open, setOpen] = useState(false);
  const hasDetails = j.judgeReasoning || j.judgeOutput || j.judgeSystemPrompt || j.judgeUserPrompt || (j.judgeInputImages && j.judgeInputImages.length > 0);

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50/50">
      <button
        type="button"
        onClick={() => hasDetails && setOpen(!open)}
        className={`flex w-full items-center gap-2 px-4 py-3 text-left ${hasDetails ? 'cursor-pointer hover:bg-gray-50' : 'cursor-default'}`}
      >
        {hasDetails && (
          <svg className={`h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform duration-200 ${open ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        )}
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          {j.judgeName && <span className="text-xs font-semibold text-gray-900">{j.judgeName}</span>}
          <span className="font-mono text-xs font-medium text-gray-900">{j.judgeModel}</span>
          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${
            j.judgeType === 'batch' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'
          }`}>
            {j.judgeType}
          </span>
          {j.judgePromptVersionId && (
            <Link
              href={`/prompt-versions/${j.judgePromptVersionId}`}
              className="text-[11px] text-primary-600 hover:text-primary-500"
              onClick={(e) => e.stopPropagation()}
            >
              {j.judgePromptVersionName || 'Prompt version'}
            </Link>
          )}
        </div>
        {j.judgeScore != null && (
          <span className="ml-auto shrink-0 rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold tabular-nums text-indigo-800">
            {j.judgeScore}
          </span>
        )}
      </button>

      {open && (
        <div className="space-y-3 border-t border-gray-200 px-4 py-3">
          {j.judgeReasoning && (
            <div>
              <SectionHeader title="Reasoning" />
              <p className="mt-2 text-sm leading-relaxed text-gray-700">{j.judgeReasoning}</p>
            </div>
          )}
          {j.judgeOutput && (
            <div>
              <SectionHeader title="Parsed output" />
              <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-md border border-gray-200 bg-white p-2 text-xs leading-relaxed text-gray-700">{j.judgeOutput}</pre>
            </div>
          )}
          {j.judgeSystemPrompt && (
            <div>
              <SectionHeader title="System prompt" />
              <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-md border border-gray-200 bg-white p-2 text-xs leading-relaxed text-gray-700">{j.judgeSystemPrompt}</pre>
            </div>
          )}
          {j.judgeUserPrompt && (
            <div>
              <SectionHeader title="User prompt" />
              <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-md border border-gray-200 bg-white p-2 text-xs leading-relaxed text-gray-700">{j.judgeUserPrompt}</pre>
            </div>
          )}
          {j.judgeInputImages && j.judgeInputImages.length > 0 && (
            <div>
              <SectionHeader title={`Input images (${j.judgeInputImages.length})`} />
              <div className="mt-2">
                <JudgeInputImageGrid images={j.judgeInputImages} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function JudgeInputImageGrid({ images }: { images: NonNullable<StrategyRunJudgeResultEntry['judgeInputImages']> }) {
  const [expandedGroup, setExpandedGroup] = useState<number | null>(null);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
        {images.map((img, i) => (
          <div key={i}>
            <div
              className={`aspect-square overflow-hidden rounded-md border bg-gray-50 ${img.isComposite ? 'cursor-pointer border-violet-400 ring-1 ring-violet-200' : 'border-gray-200'}`}
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
            <button type="button" onClick={() => setExpandedGroup(null)} className="text-xs text-violet-600 hover:text-violet-800">
              Close
            </button>
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

export function RunJudgeEvaluationsSection({
  judgeResults,
  title = 'Judge evaluations',
}: {
  judgeResults: StrategyRunJudgeResultEntry[];
  title?: string;
}) {
  if (judgeResults.length === 0) return null;

  return (
    <div className="rounded-lg border border-indigo-200 bg-white shadow-xs">
      <div className="border-b border-indigo-200 bg-indigo-50 px-4 py-3">
        <span className="text-sm font-semibold text-indigo-800">{title}</span>
        <p className="mt-0.5 text-[11px] text-indigo-700/80">
          One block per judge configuration; scores are raw per-judge scores before averaging.
        </p>
      </div>
      <div className="space-y-3 p-4">
        {judgeResults.map((j) => (
          <JudgeCard key={j.id} j={j} />
        ))}
      </div>
    </div>
  );
}
