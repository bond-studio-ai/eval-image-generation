"use client";

import { mean } from "es-toolkit";
import Link from "next/link";
import { useMemo, useState } from "react";
import { CdnImage } from "@/components/cdn-image";
import { ChevronRightIcon } from "@/components/ui/icons";
import type { StrategyRunJudgeResultEntry } from "@/lib/strategy-run-judge-results";

function SectionHeader({ title }: { title: string }) {
  return <h4 className="border-border text-text-secondary text-caption border-b pb-1.5 font-semibold">{title}</h4>;
}

interface JudgeGroup {
  judgeId: string;
  judgeName: string | null;
  judgeModel: string;
  judgeType: "batch" | "individual";
  judgePromptVersionId: string;
  judgePromptVersionName: string | null;
  position: number;
  /** Slowest invocation across this judge's entries (each entry shares the
   * same value when populated, but we max defensively so legacy nulls
   * mixed with new values don't drop the badge). */
  executionTimeMs: number | null;
  entries: StrategyRunJudgeResultEntry[];
}

function groupByJudge(results: StrategyRunJudgeResultEntry[]): JudgeGroup[] {
  const map = new Map<string, JudgeGroup>();
  for (const result of results) {
    if (!map.has(result.strategyJudgeId)) {
      map.set(result.strategyJudgeId, {
        judgeId: result.strategyJudgeId,
        judgeName: result.judgeName,
        judgeModel: result.judgeModel,
        judgeType: result.judgeType,
        judgePromptVersionId: result.judgePromptVersionId,
        judgePromptVersionName: result.judgePromptVersionName,
        position: result.position,
        executionTimeMs: null,
        entries: []
      });
    }
    const group = map.get(result.strategyJudgeId)!;
    group.entries.push(result);
    if (result.executionTimeMs != null) {
      group.executionTimeMs = Math.max(group.executionTimeMs ?? 0, result.executionTimeMs);
    }
  }
  return Array.from(map.values()).toSorted((a, b) => a.position - b.position);
}

function formatSeconds(ms: number | null | undefined): string | null {
  if (ms == null || ms <= 0) return null;
  return `${(ms / 1000).toFixed(1)}s`;
}

function JudgeGroupCard({ group }: { group: JudgeGroup }) {
  const [open, setOpen] = useState(false);

  const scoredEntries = group.entries.filter((e): e is typeof e & { judgeScore: number } => e.judgeScore != null);
  const scores = scoredEntries.map((e) => e.judgeScore);
  const avgScore = scores.length > 0 ? Math.round(mean(scores) * 10) / 10 : null;
  const isSingle = group.entries.length === 1;

  return (
    <div className="border-border bg-surface-muted/50 rounded-lg border">
      <button
        type="button"
        onClick={() => {
          setOpen(!open);
        }}
        className="hover:bg-surface-muted flex w-full items-center gap-2 px-4 py-3 text-left transition-colors"
      >
        <ChevronRightIcon className={`text-text-disabled h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${open ? "rotate-90" : ""}`} />
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          {group.judgeName && <span className="text-text-primary text-caption font-semibold">{group.judgeName}</span>}
          <span className="text-text-secondary text-caption font-mono font-medium">{group.judgeModel}</span>
          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${group.judgeType === "batch" ? "bg-primary-100 text-primary-700" : "bg-surface-sunken text-text-secondary"}`}>{group.judgeType}</span>
          {!isSingle && <span className="bg-primary-50 text-primary-700 inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium">&times;{group.entries.length} evaluations</span>}
          {group.judgePromptVersionId && (
            <Link
              href={`/prompt-versions/${group.judgePromptVersionId}`}
              className="text-primary-600 hover:text-primary-500 text-[11px]"
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              {group.judgePromptVersionName || "Prompt version"}
            </Link>
          )}
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          {formatSeconds(group.executionTimeMs) && (
            <span className="text-text-disabled text-caption tabular-nums" title="Judge wall-clock duration">
              {formatSeconds(group.executionTimeMs)}
            </span>
          )}
          {!isSingle && scores.length > 0 && (
            <div className="flex items-center gap-1">
              {scoredEntries.map((e) => (
                <span key={e.id} className="bg-surface-sunken text-text-secondary inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium tabular-nums">
                  {e.judgeScore}
                </span>
              ))}
            </div>
          )}
          {avgScore != null && <span className="bg-primary-100 text-primary-800 text-caption rounded-full px-2.5 py-0.5 font-bold tabular-nums">{isSingle ? scores[0] : `avg ${avgScore}`}</span>}
        </div>
      </button>

      {open && (
        <div className="border-border border-t">
          {group.entries.map((j, idx) => (
            <JudgeEntryRow key={j.id} j={j} index={idx} total={group.entries.length} showIndex={!isSingle} />
          ))}
        </div>
      )}
    </div>
  );
}

function JudgeEntryRow({ j, index, total, showIndex }: { j: StrategyRunJudgeResultEntry; index: number; total: number; showIndex: boolean }) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const hasPrompts = j.judgeSystemPrompt || j.judgeUserPrompt || (j.judgeInputImages && j.judgeInputImages.length > 0);

  return (
    <div className={index > 0 ? "border-border-subtle border-t" : ""}>
      <div className="px-4 py-3">
        <div className="flex items-start gap-3">
          {showIndex && <span className="text-text-secondary bg-border mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold">{index + 1}</span>}
          <div className="min-w-0 flex-1">
            {j.judgeScore != null && (
              <div className="flex items-baseline gap-2">
                <span className="text-text-secondary text-h3 tabular-nums">{j.judgeScore}</span>
                {showIndex && (
                  <span className="text-text-disabled text-[11px]">
                    {index + 1} of {total}
                  </span>
                )}
              </div>
            )}
            {j.judgeReasoning && <p className="text-text-secondary text-body mt-1 leading-relaxed">{j.judgeReasoning}</p>}
            {j.judgeOutput && <pre className="border-border bg-surface text-text-secondary text-caption mt-2 max-h-32 overflow-auto rounded-md border p-2 leading-relaxed whitespace-pre-wrap">{j.judgeOutput}</pre>}
            {hasPrompts && (
              <button
                type="button"
                onClick={() => {
                  setDetailsOpen(!detailsOpen);
                }}
                className="text-text-muted hover:text-text-secondary mt-2 text-[11px] underline"
              >
                {detailsOpen ? "Hide prompts & inputs" : "Show prompts & inputs"}
              </button>
            )}
            {detailsOpen && (
              <div className="mt-2 space-y-3">
                {j.judgeSystemPrompt && (
                  <div>
                    <SectionHeader title="System prompt" />
                    <pre className="border-border bg-surface text-text-secondary text-caption mt-2 max-h-48 overflow-auto rounded-md border p-2 leading-relaxed whitespace-pre-wrap">{j.judgeSystemPrompt}</pre>
                  </div>
                )}
                {j.judgeUserPrompt && (
                  <div>
                    <SectionHeader title="User prompt" />
                    <pre className="border-border bg-surface text-text-secondary text-caption mt-2 max-h-48 overflow-auto rounded-md border p-2 leading-relaxed whitespace-pre-wrap">{j.judgeUserPrompt}</pre>
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
        </div>
      </div>
    </div>
  );
}

function JudgeInputImageGrid({ images }: { images: NonNullable<StrategyRunJudgeResultEntry["judgeInputImages"]> }) {
  const [expandedGroup, setExpandedGroup] = useState<number | null>(null);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
        {images.map((img, i) => (
          <div key={img.url}>
            <div
              className={`bg-surface-muted relative aspect-square overflow-hidden rounded-md border ${img.isComposite ? "border-accent-400 ring-accent-200 cursor-pointer ring-1" : "border-border"}`}
              {...(img.isComposite
                ? {
                    onClick: () => {
                      setExpandedGroup(expandedGroup === i ? null : i);
                    }
                  }
                : {})}
            >
              <CdnImage src={img.url} alt={img.label} fill sizes="(max-width:768px) 25vw, 200px" className="object-cover" />
            </div>
            <div className="mt-0.5 flex items-center gap-1">
              {img.isComposite && <span className="bg-accent-100 text-accent-700 inline-flex shrink-0 items-center rounded px-1 py-px text-[9px] font-semibold">Group</span>}
              <p className="text-text-muted truncate text-[10px]" title={img.label}>
                {img.label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {expandedGroup != null && images[expandedGroup]?.isComposite && images[expandedGroup].sourceImages && (
        <div className="border-accent-200 bg-accent-50 rounded-lg border p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-accent-800 text-caption font-semibold">
              {images[expandedGroup].label} &mdash; {images[expandedGroup].sourceImages.length} source images
            </p>
            <button
              type="button"
              onClick={() => {
                setExpandedGroup(null);
              }}
              className="text-accent-600 hover:text-accent-800 text-caption"
            >
              Close
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
            {images[expandedGroup].sourceImages.map((src) => (
              <div key={src.url}>
                <div className="border-accent-200 bg-surface relative aspect-square overflow-hidden rounded-md border">
                  <CdnImage src={src.url} alt={src.label} fill sizes="(max-width:768px) 25vw, 200px" className="object-cover" />
                </div>
                <p className="text-accent-700 mt-0.5 truncate text-[10px]" title={src.label}>
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

export function RunJudgeEvaluationsSection({ judgeResults, title = "Judge evaluations" }: { judgeResults: StrategyRunJudgeResultEntry[]; title?: string }) {
  const groups = useMemo(() => groupByJudge(judgeResults), [judgeResults]);
  const slowestMs = useMemo(() => groups.reduce((longest, group) => Math.max(longest, group.executionTimeMs ?? 0), 0), [groups]);
  const slowestLabel = formatSeconds(slowestMs);

  if (judgeResults.length === 0) return null;

  return (
    <div className="border-primary-200 bg-surface rounded-lg border shadow-xs">
      <div className="border-primary-200 bg-primary-50 flex flex-wrap items-baseline gap-x-3 border-b px-4 py-3">
        <div className="flex-1">
          <span className="text-primary-800 text-body font-semibold">{title}</span>
          <p className="text-primary-700/80 mt-0.5 text-[11px]">
            {groups.length} {groups.length === 1 ? "judge" : "judges"} · {judgeResults.length} {judgeResults.length === 1 ? "evaluation" : "evaluations"} across candidates
          </p>
        </div>
        {slowestLabel && (
          <span className="bg-primary-100 text-primary-800 rounded-full px-2.5 py-0.5 text-[11px] font-medium tabular-nums" title="Slowest judge invocation">
            Slowest: {slowestLabel}
          </span>
        )}
      </div>
      <div className="space-y-3 p-4">
        {groups.map((group) => (
          <JudgeGroupCard key={group.judgeId} group={group} />
        ))}
      </div>
    </div>
  );
}
