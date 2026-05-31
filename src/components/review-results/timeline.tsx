"use client";

import { useState } from "react";
import { formatMs } from "./format";
import { ChevronIcon } from "./icons";
import type { CategoryLookup, PerCategoryTiming, SegmentationTimings } from "./types";

/**
 * Stable display labels for the step names emitted by the backend
 * (see `SegmentationTimingStep` in `segmentation.service.ts`). We
 * fall back to the raw key for forward compatibility — adding a new
 * step on the backend doesn't require a frontend change.
 */
const TIMELINE_STEP_LABELS: Record<string, string> = {
  lookup_result_id: "Find result row",
  lookup_existing_segmentation: "Check cached row",
  lookup_result_row: "Load output URL",
  lookup_input_row: "Load input categories",
  build_prompts: "Build SAM prompts",
  delete_existing: "Clear stale row",
  sam_fanout: "SAM fan-out",
  overlay_build: "Build combined overlay",
  overlay_upload: "Upload overlay to S3",
  persist: "Persist to DB"
};

/**
 * Soft pastel per-step color so the Gantt-style bars are visually
 * distinct without making each step look like an alert. Steps not in
 * this map get a neutral gray.
 */
const TIMELINE_STEP_COLORS: Record<string, string> = {
  lookup_result_id: "bg-border-strong",
  lookup_existing_segmentation: "bg-border-strong",
  lookup_result_row: "bg-border-strong",
  lookup_input_row: "bg-border-strong",
  build_prompts: "bg-border-strong",
  delete_existing: "bg-warning-300",
  sam_fanout: "bg-accent-400",
  overlay_build: "bg-primary-400",
  overlay_upload: "bg-success-400",
  persist: "bg-text-disabled"
};

function timelineStepLabel(name: string): string {
  return TIMELINE_STEP_LABELS[name] ?? name.replaceAll("_", " ");
}

function timelineStepColor(name: string): string {
  return TIMELINE_STEP_COLORS[name] ?? "bg-text-disabled";
}

/**
 * Pull the per-category SAM timing rows out of the
 * `sam_fanout.metadata.perCategory` payload. Tolerant of older runs
 * that never wrote the metadata: returns an empty list rather than
 * throwing so the bar chart simply doesn't render that subsection.
 */
function readPerCategoryTimings(metadata: Record<string, unknown> | null | undefined): PerCategoryTiming[] {
  if (!metadata) return [];
  const raw = metadata["perCategory"];
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry): PerCategoryTiming | null => {
      if (!entry || typeof entry !== "object") return null;
      const obj = entry as Record<string, unknown>;
      const category = typeof obj["category"] === "string" ? obj["category"] : null;
      const prompt = typeof obj["prompt"] === "string" ? obj["prompt"] : "";
      const durationMs = typeof obj["durationMs"] === "number" ? obj["durationMs"] : 0;
      const ok = obj["ok"] === true;
      const error = typeof obj["error"] === "string" ? obj["error"] : undefined;
      if (!category) return null;
      return { category, prompt, durationMs, ok, ...(error ? { error } : {}) };
    })
    .filter((entry): entry is PerCategoryTiming => entry !== null)
    .sort((a, b) => b.durationMs - a.durationMs);
}

/**
 * Gantt-style execution timeline for a single segmentation run. Each
 * step is rendered as a horizontal bar positioned at `startMs / totalMs`
 * with width `durationMs / totalMs`, so the viewer can spot where the
 * run actually spent time (typically SAM fan-out + overlay upload).
 *
 * Below the bars we surface the per-category SAM durations from
 * `sam_fanout.metadata.perCategory` because that's the bit that varies
 * the most between runs and the timeline-bar level resolution would
 * otherwise hide it.
 */
function SegmentationTimelineSection({ timings, lookup }: { timings: SegmentationTimings; lookup: CategoryLookup }) {
  // The backend uses a monotonic clock for offsets, but a near-zero or
  // missing total can still slip through (e.g. an aborted run). Default
  // to the max(end of last step) so we never divide by zero in the
  // bar-width math.
  const inferredTotal = Math.max(timings.totalMs, ...timings.steps.map((step) => step.startMs + step.durationMs), 1);

  const samStep = timings.steps.find((step) => step.name === "sam_fanout");
  const perCategoryRows = readPerCategoryTimings(samStep?.metadata);

  return (
    <div>
      <div className="border-border bg-surface-muted rounded-md border px-3 py-2.5">
        <div className="flex flex-col gap-1.5">
          {timings.steps.map((step, idx) => {
            const widthPct = Math.max((step.durationMs / inferredTotal) * 100, 0.5);
            const leftPct = Math.min((step.startMs / inferredTotal) * 100, 99.5);
            const sharePct = (step.durationMs / inferredTotal) * 100;
            return (
              // eslint-disable-next-line react/no-array-index-key -- stateless timeline rows, positionally stable, step names can repeat across retries
              <div key={`${step.name}-${idx}`} className="text-text-secondary flex items-center gap-2 text-[11px]">
                <span className="w-36 shrink-0 truncate" title={timelineStepLabel(step.name)}>
                  {timelineStepLabel(step.name)}
                </span>
                <div className="bg-surface ring-border relative h-3 flex-1 overflow-hidden rounded ring-1">
                  <div
                    className={`absolute top-0 bottom-0 ${timelineStepColor(step.name)}`}
                    style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                    title={`Started at ${formatMs(step.startMs)}, took ${formatMs(step.durationMs)} (${sharePct.toFixed(1)}%)`}
                  />
                </div>
                <span className="text-text-secondary w-16 shrink-0 text-right tabular-nums">{formatMs(step.durationMs)}</span>
              </div>
            );
          })}
        </div>
        {perCategoryRows.length > 0 && (
          <div className="border-border mt-3 border-t pt-2">
            <p className="text-text-muted mb-1.5 text-[10px] font-semibold tracking-wide uppercase">SAM per category</p>
            <div className="flex flex-col gap-1">
              {perCategoryRows.map((row) => (
                <div key={row.category} className="text-text-secondary flex items-center gap-2 text-[11px]">
                  <span className="w-36 shrink-0 truncate" title={`${lookup.label(row.category)} — ${row.prompt}`}>
                    {lookup.label(row.category)}
                  </span>
                  <div className="bg-surface ring-border relative h-2 flex-1 overflow-hidden rounded ring-1">
                    <div
                      className={`absolute inset-y-0 left-0 ${row.ok ? "bg-accent-300" : "bg-danger-300"}`}
                      style={{
                        width: `${Math.max((row.durationMs / Math.max(samStep?.durationMs ?? row.durationMs, 1)) * 100, 1)}%`
                      }}
                    />
                  </div>
                  <span className="text-text-secondary w-16 shrink-0 text-right tabular-nums">{formatMs(row.durationMs)}</span>
                  {!row.ok && (
                    <span className="bg-danger-50 text-danger-700 ring-danger-200 shrink-0 rounded px-1 py-0.5 text-[10px] font-semibold ring-1" title={row.error}>
                      failed
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Collapsible wrapper around `SegmentationTimelineSection`. The
 * timeline is interesting when debugging slow runs but is mostly
 * noise for everyday viewing, so it starts collapsed and the user
 * opts in.
 *
 * Uses a button + state instead of native `<details>` so the header
 * styling matches the rest of the modal (and so we can show the
 * total-ms summary on the right even while collapsed).
 */
export function CollapsibleTimeline({ timings, lookup }: { timings: SegmentationTimings; lookup: CategoryLookup }) {
  const [open, setOpen] = useState(false);
  const stepCount = timings.steps.length;

  return (
    <div className="mb-5">
      <button
        type="button"
        onClick={() => {
          setOpen((prev) => !prev);
        }}
        aria-expanded={open}
        className="border-border bg-surface-muted hover:border-border-strong hover:bg-surface-sunken flex w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-left transition-colors"
      >
        <span className="flex items-center gap-2">
          <ChevronIcon className={`text-text-muted h-3.5 w-3.5 transition-transform ${open ? "rotate-90" : ""}`} />
          <span className="text-text-secondary text-caption font-semibold tracking-wide uppercase">Execution timeline</span>
          <span className="text-text-muted text-[11px] font-normal">
            {stepCount} {stepCount === 1 ? "step" : "steps"}
          </span>
        </span>
        <span className="text-text-muted text-[11px] tabular-nums">{formatMs(timings.totalMs)} total</span>
      </button>
      {open && (
        <div className="mt-2">
          <SegmentationTimelineSection timings={timings} lookup={lookup} />
        </div>
      )}
    </div>
  );
}
