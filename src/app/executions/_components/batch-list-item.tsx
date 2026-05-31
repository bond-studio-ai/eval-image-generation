"use client";

import { useRef, useState } from "react";
import { StrategyHoverCard } from "@/components/strategy-hover-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { IconButton } from "@/components/ui/icon-button";
import { ChevronRightIcon, RotateCcwIcon, TrashIcon } from "@/components/ui/icons";
import { ListView } from "./batch-list-view";
import { MatrixView } from "./batch-matrix-view";
import { ReviewStatusBadge } from "./batch-review-status-badge";
import type { BatchRow, RunRow } from "./batch-types";

export function BatchListItem({
  batch,
  isExpanded,
  source,
  viewMode,
  retryingBatchId,
  deletingBatchId,
  retryingRunId,
  onToggle,
  onRetryFailed,
  onDeleteBatch,
  onRetry,
  onRated,
  onImageClick
}: {
  batch: BatchRow;
  isExpanded: boolean;
  source: "default" | "benchmark";
  viewMode: "list" | "matrix";
  retryingBatchId: string | null;
  deletingBatchId: string | null;
  retryingRunId: string | null;
  onToggle: (batchId: string, isExpanded: boolean) => void;
  onRetryFailed: (batchId: string) => void;
  onDeleteBatch: (batchId: string, displayName: string) => void;
  onRetry: (runId: string) => void;
  onRated: () => void;
  onImageClick: (run: RunRow) => void;
}) {
  const isBenchmark = source === "benchmark";
  const projectKeys = new Set(batch.runs.map((run) => (isBenchmark && run.batchRunId ? run.batchRunId : (run.inputPresetName ?? "(no preset)"))));
  const isMultiStrategy = batch.strategies.length > 1;

  return (
    <div className="rounded-card border-border bg-surface shadow-card border">
      <div className="flex w-full items-center justify-between px-5 py-3">
        <button
          type="button"
          onClick={() => {
            onToggle(batch.id, isExpanded);
          }}
          className="hover:bg-surface-muted focus-visible:outline-primary-600 -my-1 -ml-2 flex flex-1 cursor-pointer items-center gap-3 rounded px-2 py-1 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <ChevronRightIcon className={cn("text-text-disabled size-4 transition-transform", isExpanded && "rotate-90")} aria-hidden="true" />
          <ReviewStatusBadge status={batch.status} />
          <span className="text-body text-text-primary font-semibold">{batch.name ?? "Untitled batch"}</span>
          {isMultiStrategy ? (
            <MultiStrategyLabel strategies={batch.strategies} />
          ) : batch.strategies.length === 1 ? (
            <StrategyHoverCard strategyId={batch.strategies[0]!.id}>
              <span className="text-caption text-text-muted cursor-help font-medium">{batch.strategies[0]!.name}</span>
            </StrategyHoverCard>
          ) : null}
          <span className="text-body text-text-secondary">
            {batch.totalRuns} run{batch.totalRuns === 1 ? "" : "s"} &middot; {projectKeys.size} {isBenchmark ? "project" : "preset"}
            {projectKeys.size === 1 ? "" : "s"}
          </span>
          <span className="text-caption text-text-muted">
            {batch.completedRuns} completed
            {batch.failedRuns > 0 ? `, ${batch.failedRuns} failed` : ""}
          </span>
        </button>
        <div className="flex shrink-0 items-center gap-2">
          {batch.failedRuns > 0 && (
            <Button
              variant="secondary"
              size="sm"
              loading={retryingBatchId === batch.id}
              iconLeft={<RotateCcwIcon className="size-3.5" />}
              onClick={(e) => {
                e.stopPropagation();
                onRetryFailed(batch.id);
              }}
              className="border-warning-300 bg-warning-50 text-warning-800 hover:bg-warning-100"
            >
              Retry failed ({batch.failedRuns})
            </Button>
          )}
          <IconButton
            label="Delete batch"
            icon={<TrashIcon className="size-4" />}
            variant="danger"
            loading={deletingBatchId === batch.id}
            onClick={() => {
              onDeleteBatch(batch.id, batch.name ?? "Untitled batch");
            }}
          />
          <span className="text-caption text-text-muted">{new Date(batch.createdAt).toLocaleString()}</span>
        </div>
      </div>

      {isExpanded && (
        <div className="border-border-subtle border-t p-4">
          {viewMode === "matrix" ? (
            <MatrixView runs={batch.runs} numberOfImages={batch.numberOfImages} retryingRunId={retryingRunId} onRetry={onRetry} onRated={onRated} onImageClick={onImageClick} expanded={isExpanded} />
          ) : (
            <ListView runs={batch.runs} numberOfImages={batch.numberOfImages} isSingleStrategy={!isMultiStrategy} retryingRunId={retryingRunId} onRetry={onRetry} onRated={onRated} onImageClick={onImageClick} expanded={isExpanded} />
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Multi-strategy label with tooltip ─── */

function MultiStrategyLabel({ strategies }: { strategies: { id: string; name: string }[] }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  return (
    <span
      ref={ref}
      className="relative"
      onMouseEnter={() => {
        setShowTooltip(true);
      }}
      onMouseLeave={() => {
        setShowTooltip(false);
      }}
    >
      <Badge tone="accent" variant="soft" className="cursor-help">
        Multi-Strategy Run
      </Badge>
      {showTooltip && (
        <span className="rounded-card border-border bg-surface shadow-popover absolute top-full left-0 z-50 mt-1 w-56 border p-3">
          <span className="text-text-disabled mb-1.5 block text-[10px] font-medium tracking-wider uppercase">Strategies ({strategies.length})</span>
          {strategies.map((strategy) => (
            <span key={strategy.id} className="text-caption text-text-secondary block py-0.5">
              {strategy.name}
            </span>
          ))}
        </span>
      )}
    </span>
  );
}
