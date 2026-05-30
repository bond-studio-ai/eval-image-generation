'use client';

import { ExpandableImage } from '@/components/expandable-image';
import Link from 'next/link';
import { useState } from 'react';
import { StepAudit } from './audit';
import { SegmentationPanel } from './segmentation-panel';
import { ChevronIcon, StatusBadge, STEP_STATUS_DOT } from './shared';
import type { StepGroup, StepResult } from './types';

function GenerationTile({
  sr,
  index,
  total,
  isSelected,
}: {
  sr: StepResult;
  index: number;
  total: number;
  isSelected: boolean;
}) {
  const label = `${index + 1} of ${total}`;

  if (sr.status === 'completed' && sr.outputUrl) {
    return (
      <div className="flex flex-col gap-1.5">
        <div
          className={`relative overflow-hidden rounded-lg border-2 ${isSelected ? 'border-amber-400 ring-2 ring-amber-200' : 'border-gray-200'}`}
        >
          <ExpandableImage
            src={sr.outputUrl}
            alt={`Generation ${index + 1}`}
            wrapperClassName="relative block h-48 w-full cursor-pointer bg-gray-50"
          />
          {isSelected && (
            <div className="absolute top-1.5 left-1.5 flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white shadow">
              <svg className="size-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              Judge pick
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 text-[11px] text-gray-500">
          <span className="font-medium text-gray-700">{label}</span>
          {sr.executionTime != null && (
            <span className="tabular-nums">{(sr.executionTime / 1000).toFixed(1)}s</span>
          )}
          <StatusBadge status={sr.status} />
          {sr.generationId && (
            <Link
              href={`/generations/${sr.generationId}`}
              className="text-primary-600 hover:text-primary-500"
            >
              Detail &rarr;
            </Link>
          )}
        </div>
        {sr.segmentation && <SegmentationPanel segmentation={sr.segmentation} />}
      </div>
    );
  }

  if (sr.status === 'failed') {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex h-48 w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-red-300 bg-red-50 p-3">
          <svg
            className="size-6 text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z"
            />
          </svg>
          <div className="text-center">
            <p className="text-xs font-semibold text-red-700">Generation failed</p>
            {sr.error && (
              <p className="mt-1 line-clamp-3 text-[10px] leading-tight text-red-600">{sr.error}</p>
            )}
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
        <div className="relative h-48 w-full overflow-hidden rounded-lg border-2 border-blue-300 bg-blue-50">
          <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-blue-50 via-blue-100 to-blue-50" />
          <div className="relative flex h-full flex-col items-center justify-center gap-2">
            <svg className="size-6 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <span className="text-xs font-medium text-blue-600">Generating…</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-gray-500">
          <span className="font-medium text-gray-700">{label}</span>
          <StatusBadge status={sr.status} />
        </div>
      </div>
    );
  }

  if (sr.status === 'skipped') {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex h-48 w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-amber-200 bg-amber-50/50 p-3">
          <svg
            className="size-6 text-amber-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 8.689c0-.864.933-1.406 1.683-.977l7.108 4.061a1.125 1.125 0 0 1 0 1.954l-7.108 4.061A1.125 1.125 0 0 1 3 16.811V8.69ZM12.75 8.689c0-.864.933-1.406 1.683-.977l7.108 4.061a1.125 1.125 0 0 1 0 1.954l-7.108 4.061a1.125 1.125 0 0 1-1.683-.977V8.69Z"
            />
          </svg>
          <span className="text-xs font-medium text-amber-600">Skipped</span>
          {sr.error && (
            <p className="line-clamp-2 text-center text-[10px] leading-tight text-amber-500">
              {sr.error}
            </p>
          )}
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
      <div className="relative h-48 w-full overflow-hidden rounded-lg border-2 border-dashed border-gray-300 bg-gray-50">
        <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-gray-50 via-gray-100 to-gray-50" />
        <div className="relative flex h-full flex-col items-center justify-center gap-2">
          <div className="size-6 rounded-full border-2 border-gray-300 bg-gray-200" />
          <span className="text-xs font-medium text-gray-400">Waiting…</span>
        </div>
      </div>
      <div className="flex items-center gap-2 text-[11px] text-gray-500">
        <span className="font-medium text-gray-700">{label}</span>
        <StatusBadge status={sr.status} />
      </div>
    </div>
  );
}

export function StepGroupCard({
  group,
  defaultOpen,
  onViewPrompt,
}: {
  group: StepGroup;
  defaultOpen: boolean;
  onViewPrompt: (
    id: string,
    name: string | null,
    processedSystemPrompt: string | null,
    processedUserPrompt: string | null,
  ) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const isMulti = group.results.length > 1;
  const step = group.step;
  const representative = group.results[0];

  const completedCount = group.results.filter((r) => r.status === 'completed').length;
  const failedCount = group.results.filter((r) => r.status === 'failed').length;
  const runningCount = group.results.filter((r) => r.status === 'running').length;

  const groupStatus =
    runningCount > 0
      ? 'running'
      : failedCount === group.results.length
        ? 'failed'
        : completedCount > 0
          ? 'completed'
          : (group.results[0]?.status ?? 'pending');

  // Candidates run in parallel within a generation step, so the step's
  // wall-clock is the slowest candidate, not the sum of all candidates.
  const stepWallClockMs = group.results.reduce(
    (longest, r) => Math.max(longest, r.executionTime ?? 0),
    0,
  );

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xs">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50"
      >
        <ChevronIcon open={open} />
        <span
          className={`h-2.5 w-2.5 shrink-0 rounded-full ${STEP_STATUS_DOT[groupStatus] ?? STEP_STATUS_DOT.pending}`}
        />
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
          {stepWallClockMs > 0 && (
            <span
              className="text-xs text-gray-400 tabular-nums"
              title={isMulti ? 'Longest candidate (parallel)' : 'Generation time'}
            >
              {(stepWallClockMs / 1000).toFixed(1)}s
            </span>
          )}
          <StatusBadge status={groupStatus} />
        </span>
      </button>

      {open && (
        <div className="border-t border-gray-200">
          <div className="p-4">
            {/* Step-from badges */}
            {(step?.dollhouseViewFromStep ||
              step?.realPhotoFromStep ||
              step?.moodBoardFromStep) && (
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
                <Link
                  href={`/prompt-versions/${step.promptVersion.id}`}
                  className="text-primary-600 hover:text-primary-500 font-medium"
                >
                  {step.promptVersion.name || 'Untitled'}
                </Link>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewPrompt(
                      step.promptVersion!.id,
                      step.promptVersion!.name,
                      representative?.processedSystemPrompt ?? null,
                      representative?.processedUserPrompt ?? null,
                    );
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
                <p className="mb-2 text-[11px] font-semibold tracking-wider text-gray-400 uppercase">
                  {group.results.length} generations from this step
                </p>
                <div
                  className={`grid gap-3 ${group.results.length === 2 ? 'grid-cols-2' : group.results.length === 3 ? 'grid-cols-3' : 'grid-cols-2 lg:grid-cols-4'}`}
                >
                  {group.results.map((sr, i) => (
                    <GenerationTile
                      key={sr.id}
                      sr={sr}
                      index={i}
                      total={group.results.length}
                      isSelected={sr.isJudgeSelected}
                    />
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
                          <Link
                            href={`/generations/${sr.generationId}`}
                            className="text-primary-600 hover:text-primary-500"
                          >
                            View generation detail &rarr;
                          </Link>
                        </p>
                      )}
                      {sr.segmentation && (
                        <div className="mt-3">
                          <SegmentationPanel segmentation={sr.segmentation} />
                        </div>
                      )}
                    </div>
                  );
                }
                if (sr.status === 'failed') {
                  return (
                    <div className="flex items-center gap-3 rounded-lg border border-red-300 bg-red-50 p-4">
                      <svg
                        className="size-5 shrink-0 text-red-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z"
                        />
                      </svg>
                      <div>
                        <p className="text-sm font-semibold text-red-700">Generation failed</p>
                        {sr.error && <p className="mt-0.5 text-sm text-red-600">{sr.error}</p>}
                      </div>
                    </div>
                  );
                }
                if (sr.status === 'skipped') {
                  return (
                    <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
                      <svg
                        className="size-5 shrink-0 text-amber-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3 8.689c0-.864.933-1.406 1.683-.977l7.108 4.061a1.125 1.125 0 0 1 0 1.954l-7.108 4.061A1.125 1.125 0 0 1 3 16.811V8.69ZM12.75 8.689c0-.864.933-1.406 1.683-.977l7.108 4.061a1.125 1.125 0 0 1 0 1.954l-7.108 4.061a1.125 1.125 0 0 1-1.683-.977V8.69Z"
                        />
                      </svg>
                      <div>
                        <p className="text-sm font-semibold text-amber-700">Step skipped</p>
                        {sr.error && <p className="mt-0.5 text-sm text-amber-600">{sr.error}</p>}
                      </div>
                    </div>
                  );
                }
                if (sr.status === 'running') {
                  return (
                    <div className="relative h-56 w-full max-w-xl overflow-hidden rounded-lg border border-blue-300 bg-blue-50">
                      <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-blue-50 via-blue-100 to-blue-50" />
                      <div className="relative flex h-full flex-col items-center justify-center gap-3">
                        <svg
                          className="size-8 animate-spin text-blue-500"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                          />
                        </svg>
                        <span className="text-sm font-medium text-blue-600">Generating image…</span>
                      </div>
                    </div>
                  );
                }
                return (
                  <div className="relative h-56 w-full max-w-xl overflow-hidden rounded-lg border border-dashed border-gray-300 bg-gray-50">
                    <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-gray-50 via-gray-100 to-gray-50" />
                    <div className="relative flex h-full flex-col items-center justify-center gap-2">
                      <div className="size-8 rounded-full border-2 border-gray-300 bg-gray-200" />
                      <span className="text-sm font-medium text-gray-400">Waiting to start…</span>
                    </div>
                  </div>
                );
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
