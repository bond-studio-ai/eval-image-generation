"use client";

import Link from "next/link";
import { useState } from "react";
import { ExpandableImage } from "@/components/expandable-image";
import { AlertTriangleIcon, SkipForwardIcon, StarIcon } from "@/components/ui/icons";
import { Spinner } from "@/components/ui/spinner";
import { StepAudit } from "./audit";
import { SegmentationPanel } from "./segmentation-panel";
import { ChevronIcon, StatusBadge, STEP_STATUS_DOT } from "./shared";
import type { StepGroup, StepResult } from "./types";

function GenerationTile({ sr, index, total, isSelected }: { sr: StepResult; index: number; total: number; isSelected: boolean }) {
  const label = `${index + 1} of ${total}`;

  if (sr.status === "completed" && sr.outputUrl) {
    return (
      <div className="flex flex-col gap-1.5">
        <div className={`relative overflow-hidden rounded-lg border-2 ${isSelected ? "border-warning-400 ring-warning-200 ring-2" : "border-border"}`}>
          <ExpandableImage src={sr.outputUrl} alt={`Generation ${index + 1}`} wrapperClassName="relative block h-48 w-full cursor-pointer bg-surface-muted" />
          {isSelected && (
            <div className="bg-warning-500 text-text-inverse absolute top-1.5 left-1.5 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold shadow">
              <StarIcon className="size-3" fill="currentColor" />
              Judge pick
            </div>
          )}
        </div>
        <div className="text-text-muted flex items-center gap-2 text-[11px]">
          <span className="text-text-secondary font-medium">{label}</span>
          {sr.executionTime != null && <span className="tabular-nums">{(sr.executionTime / 1000).toFixed(1)}s</span>}
          <StatusBadge status={sr.status} />
          {sr.generationId && (
            <Link href={`/generations/${sr.generationId}`} className="text-primary-600 hover:text-primary-500">
              Detail &rarr;
            </Link>
          )}
        </div>
        {sr.segmentation && <SegmentationPanel segmentation={sr.segmentation} />}
      </div>
    );
  }

  if (sr.status === "failed") {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="border-danger-300 bg-danger-50 flex h-48 w-full flex-col items-center justify-center gap-2 rounded-lg border-2 p-3">
          <AlertTriangleIcon className="text-danger-400 size-6" />
          <div className="text-center">
            <p className="text-danger-700 text-caption font-semibold">Generation failed</p>
            {sr.error && <p className="text-danger-600 mt-1 line-clamp-3 text-[10px] leading-tight">{sr.error}</p>}
          </div>
        </div>
        <div className="text-text-muted flex items-center gap-2 text-[11px]">
          <span className="text-text-secondary font-medium">{label}</span>
          <StatusBadge status={sr.status} />
        </div>
      </div>
    );
  }

  if (sr.status === "running") {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="border-primary-300 bg-primary-50 relative h-48 w-full overflow-hidden rounded-lg border-2">
          <div className="from-primary-50 via-primary-100 to-primary-50 absolute inset-0 animate-pulse bg-gradient-to-r" />
          <div className="relative flex h-full flex-col items-center justify-center gap-2">
            <Spinner className="text-primary-500 size-6" />
            <span className="text-primary-600 text-caption font-medium">Generating…</span>
          </div>
        </div>
        <div className="text-text-muted flex items-center gap-2 text-[11px]">
          <span className="text-text-secondary font-medium">{label}</span>
          <StatusBadge status={sr.status} />
        </div>
      </div>
    );
  }

  if (sr.status === "skipped") {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="border-warning-200 bg-warning-50/50 flex h-48 w-full flex-col items-center justify-center gap-2 rounded-lg border-2 p-3">
          <SkipForwardIcon className="text-warning-400 size-6" />
          <span className="text-warning-600 text-caption font-medium">Skipped</span>
          {sr.error && <p className="text-warning-500 line-clamp-2 text-center text-[10px] leading-tight">{sr.error}</p>}
        </div>
        <div className="text-text-muted flex items-center gap-2 text-[11px]">
          <span className="text-text-secondary font-medium">{label}</span>
          <StatusBadge status={sr.status} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="border-border-strong bg-surface-muted relative h-48 w-full overflow-hidden rounded-lg border-2 border-dashed">
        <div className="from-surface-muted via-surface-sunken to-surface-muted absolute inset-0 animate-pulse bg-gradient-to-r" />
        <div className="relative flex h-full flex-col items-center justify-center gap-2">
          <div className="border-border-strong bg-border size-6 rounded-full border-2" />
          <span className="text-text-disabled text-caption font-medium">Waiting…</span>
        </div>
      </div>
      <div className="text-text-muted flex items-center gap-2 text-[11px]">
        <span className="text-text-secondary font-medium">{label}</span>
        <StatusBadge status={sr.status} />
      </div>
    </div>
  );
}

export function StepGroupCard({
  group,
  defaultOpen,
  onViewPrompt
}: {
  group: StepGroup;
  defaultOpen: boolean;
  onViewPrompt: (id: string, name: string | null, processedSystemPrompt: string | null, processedUserPrompt: string | null) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const isMulti = group.results.length > 1;
  const { step } = group;
  const representative = group.results[0];

  const completedCount = group.results.filter((run) => run.status === "completed").length;
  const failedCount = group.results.filter((run) => run.status === "failed").length;
  const runningCount = group.results.filter((run) => run.status === "running").length;

  const groupStatus = runningCount > 0 ? "running" : failedCount === group.results.length ? "failed" : completedCount > 0 ? "completed" : (group.results[0]?.status ?? "pending");

  // Candidates run in parallel within a generation step, so the step's
  // wall-clock is the slowest candidate, not the sum of all candidates.
  const stepWallClockMs = group.results.reduce((longest, run) => Math.max(longest, run.executionTime ?? 0), 0);

  return (
    <div className="border-border bg-surface overflow-hidden rounded-lg border shadow-xs">
      <button
        type="button"
        onClick={() => {
          setOpen(!open);
        }}
        className="hover:bg-surface-muted flex w-full items-center gap-3 px-4 py-3 text-left transition-colors"
      >
        <ChevronIcon open={open} />
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${STEP_STATUS_DOT[groupStatus] ?? STEP_STATUS_DOT["pending"] ?? ""}`} />
        <span className="text-text-primary text-body font-semibold">{group.name}</span>
        {isMulti && <span className="bg-primary-50 text-primary-700 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium">&times;{group.results.length}</span>}
        <span className="text-text-muted text-caption">{group.model}</span>
        {step?.promptVersion && <span className="text-text-disabled text-caption hidden sm:inline">· {step.promptVersion.name || "Untitled prompt"}</span>}
        <span className="ml-auto flex items-center gap-2">
          {stepWallClockMs > 0 && (
            <span className="text-text-disabled text-caption tabular-nums" title={isMulti ? "Longest candidate (parallel)" : "Generation time"}>
              {(stepWallClockMs / 1000).toFixed(1)}s
            </span>
          )}
          <StatusBadge status={groupStatus} />
        </span>
      </button>

      {open && (
        <div className="border-border border-t">
          <div className="p-4">
            {/* Step-from badges */}
            {(step?.dollhouseViewFromStep || step?.realPhotoFromStep || step?.moodBoardFromStep) && (
              <div className="mb-3 flex flex-wrap gap-2">
                {step.dollhouseViewFromStep && (
                  <span className="bg-warning-50 text-warning-700 ring-warning-600/20 text-caption inline-flex items-center rounded-full px-2.5 py-0.5 font-medium ring-1 ring-inset">
                    Dollhouse View &larr; Step {step.dollhouseViewFromStep}
                  </span>
                )}
                {step.realPhotoFromStep && (
                  <span className="bg-warning-50 text-warning-700 ring-warning-600/20 text-caption inline-flex items-center rounded-full px-2.5 py-0.5 font-medium ring-1 ring-inset">Real Photo &larr; Step {step.realPhotoFromStep}</span>
                )}
                {step.moodBoardFromStep && (
                  <span className="bg-warning-50 text-warning-700 ring-warning-600/20 text-caption inline-flex items-center rounded-full px-2.5 py-0.5 font-medium ring-1 ring-inset">Mood Board &larr; Step {step.moodBoardFromStep}</span>
                )}
              </div>
            )}

            {/* Prompt link */}
            {step?.promptVersion && (
              <div className="text-caption mb-3 flex items-center gap-3">
                <span className="text-text-muted">Prompt:</span>
                <Link href={`/prompt-versions/${step.promptVersion.id}`} className="text-primary-600 hover:text-primary-500 font-medium">
                  {step.promptVersion.name || "Untitled"}
                </Link>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewPrompt(step.promptVersion!.id, step.promptVersion!.name, representative?.processedSystemPrompt ?? null, representative?.processedUserPrompt ?? null);
                  }}
                  className="text-text-muted hover:text-text-secondary underline"
                >
                  View prompt
                </button>
              </div>
            )}

            {/* Multiple executions of the same step */}
            {isMulti ? (
              <div>
                <p className="text-text-disabled mb-2 text-[11px] font-semibold tracking-wider uppercase">{group.results.length} generations from this step</p>
                <div className={`grid gap-3 ${group.results.length === 2 ? "grid-cols-2" : group.results.length === 3 ? "grid-cols-3" : "grid-cols-2 lg:grid-cols-4"}`}>
                  {group.results.map((sr, i) => (
                    <GenerationTile key={sr.id} sr={sr} index={i} total={group.results.length} isSelected={sr.isJudgeSelected} />
                  ))}
                </div>
              </div>
            ) : (
              /* Single result */
              (() => {
                const sr = representative;
                if (!sr) return <p className="text-text-disabled text-body py-4">No results</p>;
                if (sr.status === "completed" && sr.outputUrl) {
                  return (
                    <div>
                      <ExpandableImage src={sr.outputUrl} alt={`${group.name} output`} wrapperClassName="relative block h-80 w-full max-w-xl rounded-lg border border-border bg-surface-muted" />
                      {sr.generationId && (
                        <p className="text-text-muted text-caption mt-2">
                          <Link href={`/generations/${sr.generationId}`} className="text-primary-600 hover:text-primary-500">
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
                if (sr.status === "failed") {
                  return (
                    <div className="border-danger-300 bg-danger-50 flex items-center gap-3 rounded-lg border p-4">
                      <AlertTriangleIcon className="text-danger-400 size-5 shrink-0" />
                      <div>
                        <p className="text-danger-700 text-body font-semibold">Generation failed</p>
                        {sr.error && <p className="text-danger-600 text-body mt-0.5">{sr.error}</p>}
                      </div>
                    </div>
                  );
                }
                if (sr.status === "skipped") {
                  return (
                    <div className="border-warning-200 bg-warning-50 flex items-center gap-3 rounded-lg border p-4">
                      <SkipForwardIcon className="text-warning-400 size-5 shrink-0" />
                      <div>
                        <p className="text-warning-700 text-body font-semibold">Step skipped</p>
                        {sr.error && <p className="text-warning-600 text-body mt-0.5">{sr.error}</p>}
                      </div>
                    </div>
                  );
                }
                if (sr.status === "running") {
                  return (
                    <div className="border-primary-300 bg-primary-50 relative h-56 w-full max-w-xl overflow-hidden rounded-lg border">
                      <div className="from-primary-50 via-primary-100 to-primary-50 absolute inset-0 animate-pulse bg-gradient-to-r" />
                      <div className="relative flex h-full flex-col items-center justify-center gap-3">
                        <Spinner className="text-primary-500 size-8" />
                        <span className="text-primary-600 text-body font-medium">Generating image…</span>
                      </div>
                    </div>
                  );
                }
                return (
                  <div className="border-border-strong bg-surface-muted relative h-56 w-full max-w-xl overflow-hidden rounded-lg border border-dashed">
                    <div className="from-surface-muted via-surface-sunken to-surface-muted absolute inset-0 animate-pulse bg-gradient-to-r" />
                    <div className="relative flex h-full flex-col items-center justify-center gap-2">
                      <div className="border-border-strong bg-border size-8 rounded-full border-2" />
                      <span className="text-text-disabled text-body font-medium">Waiting to start…</span>
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
