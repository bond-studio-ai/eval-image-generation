'use client';

import { useState } from 'react';
import { ChevronIcon } from './icons';
import { CompositeMaskCanvas, SkeletonImage } from './mask-preview';
import type { CategoryRow } from './types';

/**
 * Per-category card: combined mask preview on top (every mask blended
 * into one silhouette), then a grid of every individual mask
 * underneath with score badges so the user can inspect each prediction
 * separately.
 *
 * The combined preview is computed on a canvas at display time rather
 * than relying on FAL's `image` field, which (in practice) is just
 * the top-scored mask repeated — i.e. not actually a merge of all
 * masks.
 */
function CategoryCard({ row }: { row: CategoryRow }) {
  const totalMasks = row.masks.length;
  const showIndividualMasks = totalMasks >= 1;
  const swatch = row.color;
  // The SAM prompt fired for this category. Surfaced prominently so
  // reviewers can tell at a glance which noun phrase produced the
  // mask — useful when two cards share a prompt string (e.g. paints
  // and wallpapers both fire `Wall`) or when a category fires a
  // narrow prompt (`Wainscoting` for wall_tiles).
  const promptLine = row.promptLabel ? `SAM prompt: "${row.promptLabel}"` : null;
  // Sibling members the drift comparator considers alongside this
  // category. For multi-member groups (Wall, Floor, Toilet, …) this
  // lists every member so the tooltip can show the union scope.
  // For singletons there's only one entry (the category itself) so
  // we hide the hint to avoid noise.
  const siblings = (row.consumerLabels ?? []).filter((label) => label !== row.label);
  const consumerHint = siblings.length > 0 ? `Drift considers: ${siblings.join(', ')}` : null;

  return (
    <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <span
            className="inline-block h-3 w-3 shrink-0 rounded-sm ring-1 ring-gray-300"
            style={{ backgroundColor: swatch }}
            aria-hidden="true"
          />
          <p className="truncate text-xs font-semibold text-gray-800" title={row.label}>
            {row.label}
          </p>
        </div>
        {row.topScore !== null && (
          <span className="shrink-0 rounded bg-white px-1.5 py-0.5 text-[10px] text-gray-700 tabular-nums ring-1 ring-gray-200">
            {row.topScore.toFixed(2)}
          </span>
        )}
      </div>
      {promptLine && (
        <p className="mt-0.5 truncate text-[10px] text-gray-600" title={promptLine}>
          {promptLine}
        </p>
      )}
      <p className="mt-0.5 text-[10px] text-gray-500">
        {totalMasks} {totalMasks === 1 ? 'mask' : 'masks'}
      </p>
      {consumerHint && (
        <p className="mt-0.5 truncate text-[10px] text-gray-400" title={consumerHint}>
          {consumerHint}
        </p>
      )}

      {row.masks.length > 0 ? (
        <div className="relative mt-2 block aspect-square w-full overflow-hidden rounded border border-gray-200 bg-white">
          <CompositeMaskCanvas
            masks={row.masks}
            alt={`${row.label} combined mask preview (${totalMasks} ${totalMasks === 1 ? 'mask' : 'masks'} merged)`}
            containerClassName="h-full w-full"
            canvasClassName="h-full w-full object-contain"
          />
        </div>
      ) : (
        <div className="mt-2 flex aspect-square w-full items-center justify-center rounded border border-dashed border-gray-200 bg-white">
          <p className="px-2 text-center text-[10px] text-gray-400 italic">No masks returned</p>
        </div>
      )}

      {showIndividualMasks && (
        <div className="mt-2">
          <p className="mb-1 text-[10px] font-semibold tracking-wide text-gray-500 uppercase">
            Individual masks
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {row.masks.map((mask, idx) => (
              <a
                key={`${mask.url}-${idx}`}
                href={mask.url}
                target="_blank"
                rel="noopener noreferrer"
                title={
                  mask.score !== null
                    ? `Mask ${idx + 1} · score ${mask.score.toFixed(3)}`
                    : `Mask ${idx + 1}`
                }
                className="group relative block aspect-square overflow-hidden rounded border border-gray-200 bg-white"
              >
                <SkeletonImage
                  src={mask.url}
                  alt={`${row.label} mask ${idx + 1}`}
                  containerClassName="h-full w-full"
                  imgClassName="h-full w-full object-contain"
                />
                {mask.score !== null && (
                  <span className="absolute right-0.5 bottom-0.5 rounded bg-black/60 px-1 py-px text-[9px] font-medium text-white tabular-nums">
                    {mask.score.toFixed(2)}
                  </span>
                )}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Color → category swatch grid rendered under the combined overlay so
 * the viewer can map each tinted region back to a product type. Uses
 * the categories actually present on the segmentation record (sorted
 * by label to match the per-category grid below).
 *
 * Laid out as an explicit CSS grid (not flex-wrap) so swatch + label
 * pairs line up in clean columns across rows — the user explicitly
 * called out that the previous flex-wrap version felt ragged.
 */
export function SegmentationLegend({ rows }: { rows: CategoryRow[] }) {
  // One swatch per category. With the per-category fan-out, each
  // category now contributes a single row, so the dedup is largely a
  // no-op — but we keep it defensively in case an upstream change
  // produces duplicates (e.g. union of legacy + new rows).
  const seen = new Map<string, { color: string; displayLabel: string; totalMasks: number }>();
  for (const row of rows) {
    const displayLabel = row.baseLabel ?? row.label;
    const existing = seen.get(row.category);
    if (existing) {
      existing.totalMasks += row.masks.length;
      continue;
    }
    seen.set(row.category, {
      color: row.color,
      displayLabel,
      totalMasks: row.masks.length,
    });
  }
  const entries = Array.from(seen.entries());

  return (
    <div className="mt-3 rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {entries.map(([category, entry]) => (
          <div key={category} className="flex min-w-0 items-center gap-1.5">
            <span
              className="inline-block h-3 w-3 shrink-0 rounded-sm ring-1 ring-gray-300"
              style={{ backgroundColor: entry.color }}
              aria-hidden="true"
            />
            <span
              className="truncate text-[11px] leading-tight text-gray-700"
              title={`${entry.displayLabel} · ${entry.totalMasks} ${entry.totalMasks === 1 ? 'mask' : 'masks'}`}
            >
              {entry.displayLabel}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Collapsible wrapper around the per-category cards grid. The grid is
 * heavy — it lazily loads/blends every mask PNG on a `<canvas>` per
 * card, plus a thumbnail per individual mask — so we keep it
 * collapsed by default and let the user opt into the full inspection
 * view. The header summarizes how many categories and masks are
 * inside without having to expand.
 */
export function CollapsibleCategoryGrid({ rows }: { rows: CategoryRow[] }) {
  const [open, setOpen] = useState(false);
  const totalMasks = rows.reduce((sum, row) => sum + row.masks.length, 0);

  return (
    <div className="mb-5">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-left transition-colors hover:border-gray-300 hover:bg-gray-100"
      >
        <span className="flex items-center gap-2">
          <ChevronIcon
            className={`h-3.5 w-3.5 text-gray-500 transition-transform ${open ? 'rotate-90' : ''}`}
          />
          <span className="text-xs font-semibold tracking-wide text-gray-700 uppercase">
            Per-category masks
          </span>
          <span className="text-[11px] font-normal text-gray-500">
            {rows.length} {rows.length === 1 ? 'category' : 'categories'}
          </span>
        </span>
        <span className="text-[11px] text-gray-500 tabular-nums">
          {totalMasks} {totalMasks === 1 ? 'mask' : 'masks'}
        </span>
      </button>
      {open && (
        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((row) => (
            <CategoryCard
              key={`${row.category}/${row.group ?? row.category}/${row.promptSlug ?? row.category}`}
              row={row}
            />
          ))}
        </div>
      )}
    </div>
  );
}
