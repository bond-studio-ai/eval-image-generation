"use client";

import { useCallback } from "react";
import { AlertCircleIcon, CheckIcon, SparklesIcon } from "@/components/ui/icons";
import { Spinner } from "@/components/ui/spinner";
import { runReviewPost } from "./run-review-post";

/**
 * One badge state per `generationId`. Mirrors the lifecycle of the
 * review pipeline (SAM fan-out + every registered review plugin) for
 * that generation: not yet kicked off, currently being hydrated from
 * the backend, currently running, finished, or failed. `done` carries
 * the success/total counts when we have them (only after a fresh
 * POST — GET responses don't include the counts).
 */
export type ReviewState = { kind: "idle" } | { kind: "checking" } | { kind: "running" } | { kind: "done"; cached?: boolean; succeeded?: number; total?: number } | { kind: "error"; message?: string };

interface SegmentationBadgeProps {
  generationId: string | null | undefined;
  /**
   * Current review state, owned by the parent (the shared `useBatchReviewStatus`
   * cache). Defaults to `idle` when unset. This is a controlled component — the
   * parent is the single source of truth.
   */
  state?: ReviewState;
  /** Notified whenever the badge transitions, so the parent's shared cache stays
   * in sync (collapsing + re-expanding doesn't lose progress). */
  onStateChange: (next: ReviewState) => void;
}

export function ReviewBadge({ generationId, state: stateProp, onStateChange }: SegmentationBadgeProps) {
  const state = stateProp ?? { kind: "idle" };

  const runReview = useCallback(
    async (force: boolean) => {
      if (!generationId) return;
      onStateChange({ kind: "running" });
      const next = await runReviewPost(generationId, force);
      onStateChange(next);
    },
    [generationId, onStateChange]
  );

  if (!generationId) return null;

  if (state.kind === "checking") {
    return (
      <span className="bg-surface-sunken text-text-secondary mt-1 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium">
        <Spinner className="size-2.5" />
        Checking
      </span>
    );
  }

  if (state.kind === "running") {
    return (
      <span className="bg-warning-500/90 text-text-inverse mt-1 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold shadow-sm" title="Review in progress">
        <Spinner className="size-2.5" />
        Reviewing
      </span>
    );
  }

  if (state.kind === "done") {
    const label = typeof state.succeeded === "number" && typeof state.total === "number" ? `Reviewed ${state.succeeded}/${state.total}` : "Reviewed";
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          runReview(true);
        }}
        title={state.cached ? "Cached. Click to re-run." : "Click to re-run review."}
        className="text-text-inverse bg-text-secondary/80 hover:bg-text-secondary mt-1 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold shadow-sm transition-colors"
      >
        <CheckIcon className="size-2.5" />
        {label}
      </button>
    );
  }

  if (state.kind === "error") {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          runReview(false);
        }}
        title={state.message ?? "Click to retry."}
        className="bg-danger-500/90 text-text-inverse hover:bg-danger-500 mt-1 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold shadow-sm transition-colors"
      >
        <AlertCircleIcon className="size-2.5" />
        Review failed
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        runReview(false);
      }}
      className="border-border-strong bg-surface text-text-secondary hover:bg-surface-muted hover:border-border-strong mt-1 inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium transition-colors"
    >
      <SparklesIcon className="size-2.5" />
      Automate QA
    </button>
  );
}
