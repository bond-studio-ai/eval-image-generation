'use client';

import { useMemo } from 'react';
import { CollapsibleCategoryGrid, SegmentationLegend } from './category-grid';
import { buildCategoryLookup, useSegmentationCategories } from './category-lookup';
import { buildRows } from './category-rows';
import { OverlayComparison } from './overlay-comparison';
import { pluginEntriesFor } from './plugin-renderers';
import { CollapsibleTimeline } from './timeline';
import type { DriftAssessment, ReviewRecord } from './types';

/**
 * Modal layout for the review results view. Composes the timeline,
 * each registered plugin section (segmentation drift, depth drift,
 * future plugins), combined-overlay preview, legend, and per-category
 * grid sections; the actual fetch + state lifecycle lives in the
 * parent `ReviewResultsBadge` so the modal stays a pure presentational
 * component over `record`.
 */
export function ReviewModal({
  generationId,
  record,
  loading,
  error,
  onClose,
}: {
  generationId: string;
  record: ReviewRecord | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
}) {
  const categories = useSegmentationCategories();
  const lookup = useMemo(() => buildCategoryLookup(categories), [categories]);
  const rows = useMemo(() => buildRows(record, lookup, categories), [record, lookup, categories]);
  const totalMasks = rows.reduce((sum, row) => sum + row.masks.length, 0);
  const pluginEntries = useMemo(() => pluginEntriesFor(record?.reviewAssessment ?? null), [record]);
  const segmentationDrift = (record?.reviewAssessment?.plugins?.segmentationDrift ?? null) as
    | DriftAssessment
    | null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-4">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-gray-900">Review</h3>
            <p className="mt-0.5 text-xs text-gray-500">
              {rows.length > 0
                ? `${rows.length} ${rows.length === 1 ? 'category' : 'categories'} · ${totalMasks} ${totalMasks === 1 ? 'mask' : 'masks'}`
                : loading
                  ? 'Loading…'
                  : 'No categories'}
              {record?.createdAt && (
                <>
                  {' · '}
                  {new Date(record.createdAt).toLocaleString()}
                </>
              )}
            </p>
            <p className="mt-0.5 font-mono text-[10px] text-gray-400">
              gen {generationId.slice(0, 8)}…
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {loading && (
            <div className="flex items-center justify-center py-16 text-sm text-gray-500">
              <svg className="mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
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
              Loading review…
            </div>
          )}
          {error && !loading && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {/* All collapsible sections stack at the top so the
              reviewer's first scroll reveals the drift, timeline,
              and per-category accordions before the overlay
              preview. Putting the picture first pushed every other
              affordance below the fold. */}
          {!loading && !error && record?.timings && (
            <CollapsibleTimeline timings={record.timings} lookup={lookup} />
          )}
          {/* Iterate the plugin registry; each renderer pulls its own
              payload out of `reviewAssessment.plugins[plugin.id]` so
              new plugins ship a renderer + a registry entry without
              touching this file. */}
          {!loading &&
            !error &&
            pluginEntries.map(({ renderer, assessment }) => (
              <renderer.Renderer
                key={renderer.id}
                assessment={assessment}
                lookup={lookup}
                categories={categories}
              />
            ))}
          {!loading && !error && rows.length > 0 && <CollapsibleCategoryGrid rows={rows} />}
          {!loading && !error && record?.combinedOverlayUrl && (
            <OverlayComparison
              overlayUrl={record.combinedOverlayUrl}
              productMaskUrl={segmentationDrift?.productMaskUrl ?? null}
            />
          )}
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
          {!loading &&
            !error &&
            rows.length === 0 &&
            !record?.combinedOverlayUrl &&
            pluginEntries.length === 0 && (
              <p className="py-12 text-center text-sm text-gray-500">
                No review results to display.
              </p>
            )}
        </div>
      </div>
    </div>
  );
}
