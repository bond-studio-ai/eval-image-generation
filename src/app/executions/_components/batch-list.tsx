"use client";

import type { Ref } from "react";
import { BatchListItem } from "./batch-list-item";
import { BatchLoadMoreSkeleton } from "./batch-loading-skeleton";
import type { BatchRow, RunRow } from "./batch-types";

export function BatchList({
  batches,
  refreshing,
  hasMore,
  loadingMore,
  appliedFrom,
  appliedTo,
  sentinelRef,
  expandedIds,
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
  batches: BatchRow[];
  refreshing: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  appliedFrom: string;
  appliedTo: string;
  sentinelRef: Ref<HTMLDivElement>;
  expandedIds: Set<string>;
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
  if (batches.length === 0 && !refreshing) {
    return <p className="text-body text-text-secondary">{appliedFrom || appliedTo ? "No runs match the selected date range." : "No runs yet. Use \u201CRun\u201D to create one."}</p>;
  }

  return (
    <div className={`space-y-4 transition-opacity duration-200 ${refreshing ? "pointer-events-none opacity-40" : "opacity-100"}`}>
      {batches.map((batch) => (
        <BatchListItem
          key={batch.id}
          batch={batch}
          isExpanded={expandedIds.has(batch.id)}
          source={source}
          viewMode={viewMode}
          retryingBatchId={retryingBatchId}
          deletingBatchId={deletingBatchId}
          retryingRunId={retryingRunId}
          onToggle={onToggle}
          onRetryFailed={onRetryFailed}
          onDeleteBatch={onDeleteBatch}
          onRetry={onRetry}
          onRated={onRated}
          onImageClick={onImageClick}
        />
      ))}
      {hasMore && <div ref={sentinelRef}>{loadingMore ? <BatchLoadMoreSkeleton /> : <div className="py-4">&nbsp;</div>}</div>}
    </div>
  );
}
