"use client";

import { sumBy } from "es-toolkit";
import { useMemo } from "react";
import { XIcon } from "@/components/ui/icons";
import { Modal } from "@/components/ui/modal";
import { Spinner } from "@/components/ui/spinner";
import { CollapsibleCategoryGrid, SegmentationLegend } from "./category-grid";
import { buildCategoryLookup, useSegmentationCategories } from "./category-lookup";
import { buildRows } from "./category-rows";
import { OverlayComparison } from "./overlay-comparison";
import { pluginEntriesFor } from "./plugin-renderers";
import { CollapsibleTimeline } from "./timeline";
import type { ReviewRecord } from "./types";

/**
 * Modal layout for the review results view. Composes the timeline,
 * each registered plugin section (segmentation drift, depth drift,
 * future plugins), combined-overlay preview, legend, and per-category
 * grid sections; the actual fetch + state lifecycle lives in the
 * parent `ReviewResultsBadge` so the modal stays a pure presentational
 * component over `record`.
 */
function reviewSummaryLabel(rowCount: number, totalMasks: number, loading: boolean): string {
  if (rowCount > 0) {
    const categoryWord = rowCount === 1 ? "category" : "categories";
    const maskWord = totalMasks === 1 ? "mask" : "masks";
    return `${rowCount} ${categoryWord} · ${totalMasks} ${maskWord}`;
  }
  return loading ? "Loading…" : "No categories";
}

export function ReviewModal({ generationId, record, loading, error, onClose }: { generationId: string; record: ReviewRecord | null; loading: boolean; error: string | null; onClose: () => void }) {
  const categories = useSegmentationCategories();
  const lookup = useMemo(() => buildCategoryLookup(categories), [categories]);
  const rows = useMemo(() => buildRows(record, lookup, categories), [record, lookup, categories]);
  const totalMasks = sumBy(rows, (row) => row.masks.length);
  const pluginEntries = useMemo(() => pluginEntriesFor(record?.reviewAssessment ?? null), [record]);
  const segmentationDrift = record?.reviewAssessment?.plugins?.segmentationDrift ?? null;

  return (
    <Modal onClose={onClose} labelledById="review-modal-title" backdropClassName="bg-overlay/60" className="bg-surface flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl shadow-2xl">
      <div className="border-border flex items-start justify-between gap-4 border-b px-6 py-4">
        <div className="min-w-0">
          <h3 id="review-modal-title" className="text-text-primary text-body-lg font-semibold">
            Review
          </h3>
          <p className="text-text-muted text-caption mt-0.5">
            {reviewSummaryLabel(rows.length, totalMasks, loading)}
            {record?.createdAt && (
              <>
                {" · "}
                {new Date(record.createdAt).toLocaleString()}
              </>
            )}
          </p>
          <p className="text-text-disabled mt-0.5 font-mono text-[10px]">gen {generationId.slice(0, 8)}…</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="text-text-disabled hover:bg-surface-sunken hover:text-text-secondary rounded-lg p-1.5 transition-colors">
          <XIcon className="size-5" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        {loading && (
          <div className="text-text-muted text-body flex items-center justify-center py-16">
            <Spinner className="mr-2 size-4" />
            Loading review…
          </div>
        )}
        {error && !loading && <div className="border-danger-200 bg-danger-50 text-danger-700 text-body rounded-lg border p-3">{error}</div>}
        {/* All collapsible sections stack at the top so the
              reviewer's first scroll reveals the drift, timeline,
              and per-category accordions before the overlay
              preview. Putting the picture first pushed every other
              affordance below the fold. */}
        {!loading && !error && record?.timings && <CollapsibleTimeline timings={record.timings} lookup={lookup} />}
        {/* Iterate the plugin registry; each renderer pulls its own
              payload out of `reviewAssessment.plugins[plugin.id]` so
              new plugins ship a renderer + a registry entry without
              touching this file. */}
        {!loading && !error && pluginEntries.map(({ renderer, assessment }) => <renderer.Renderer key={renderer.id} assessment={assessment} lookup={lookup} categories={categories} />)}
        {!loading && !error && rows.length > 0 && <CollapsibleCategoryGrid rows={rows} />}
        {!loading && !error && record?.combinedOverlayUrl && <OverlayComparison overlayUrl={record.combinedOverlayUrl} productMaskUrl={segmentationDrift?.productMaskUrl ?? null} />}
        {/* Render the legend whenever we have categories, even if the
              combined overlay PNG didn't get built (older row, sharp/S3
              hiccup, etc.). The per-card swatches use the same colors,
              so the legend is the user's anchor for what each tint
              means regardless of overlay presence. */}
        {!loading && !error && rows.length > 0 && (
          <div className="mb-5">
            <SegmentationLegend rows={rows} />
          </div>
        )}
        {/* Empty-state copy is suppressed when any plugin renderer
              produced a card — otherwise a depth-only run (no SAM
              category rows, no overlay PNG) would show "No review
              results to display." right next to the Depth drift card,
              which obviously contradicts itself. */}
        {!loading && !error && rows.length === 0 && !record?.combinedOverlayUrl && pluginEntries.length === 0 && <p className="text-text-muted text-body py-12 text-center">No review results to display.</p>}
      </div>
    </Modal>
  );
}
