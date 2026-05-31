"use client";

import { assertNever } from "@/lib/assert-never";
import { useTooltip } from "./tooltip";
import type { CategoryLookup, DriftRow, LargeObjectDriftMetrics, SmallObjectDriftMetrics, SurfaceDriftMetrics } from "./types";

export const NOT_APPLICABLE_CELL = <span className="text-text-disabled">—</span>;

/**
 * Stable identifiers for every sortable column. Decoupled from the
 * underlying metric property names because two columns share the
 * "p95 distance" concept across different metric shapes
 * (`p95SymmetricDistancePx` for large objects, `p95DistancePx` for
 * small objects) and we want one sort key per column, not per shape.
 */
export type SortKey = "category" | "coverage" | "iou" | "centroid" | "p95" | "areaRatio" | "boundary" | "pixelAccuracy" | "presence" | "pixels";

export type SortDir = "asc" | "desc";

/**
 * Extract the sortable value for `(row, key)`. Returns `null` when
 * the column doesn't apply to the row's bucket (e.g. IoU on a small
 * object) — those rows sink to the bottom regardless of sort
 * direction.
 *
 * For `pixels`, we sort by dollhouse pixel count so the "biggest
 * ground-truth region" rises to the top — that's the column most
 * worth scanning when triaging which products are dominating the
 * scene.
 */
export function getSortValue(row: DriftRow, key: SortKey, lookup: CategoryLookup): number | string | null {
  const { kind, metrics } = row;
  switch (key) {
    case "areaRatio": {
      if (kind === "largeObject") return (metrics as LargeObjectDriftMetrics).areaRatio;
      return null;
    }
    case "boundary": {
      if (kind === "surface") return (metrics as SurfaceDriftMetrics).boundaryDriftPx;
      return null;
    }
    case "category": {
      return lookup.label(row.key).toLowerCase();
    }
    case "centroid": {
      if (kind === "largeObject" || kind === "smallObject") return (metrics as LargeObjectDriftMetrics | SmallObjectDriftMetrics).centroidDriftPx;
      return null;
    }
    case "coverage": {
      return metrics.productMaskCoverage?.recall ?? null;
    }
    case "iou": {
      if (kind === "largeObject" || kind === "surface") return (metrics as LargeObjectDriftMetrics | SurfaceDriftMetrics).iou;
      return null;
    }
    case "p95": {
      if (kind === "largeObject") return (metrics as LargeObjectDriftMetrics).p95SymmetricDistancePx;
      if (kind === "smallObject") return (metrics as SmallObjectDriftMetrics).p95DistancePx;
      return null;
    }
    case "pixelAccuracy": {
      if (kind === "surface") return (metrics as SurfaceDriftMetrics).pixelClassAccuracy;
      return null;
    }
    case "pixels": {
      return metrics.dollhousePixelCount;
    }
    case "presence": {
      if (kind === "smallObject") return (metrics as SmallObjectDriftMetrics).presence;
      return null;
    }
    default: {
      return assertNever(key);
    }
  }
}

export function compareSortValues(a: number | string | null, b: number | string | null, dir: SortDir): number {
  // `null` (column doesn't apply to this row) always lands at the end,
  // independent of asc/desc — sorting on a column the row doesn't have
  // a value for is never useful information.
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  const raw = typeof a === "string" && typeof b === "string" ? a.localeCompare(b) : (a as number) - (b as number);
  return dir === "desc" ? -raw : raw;
}

/**
 * Sort indicator next to a sortable header. Renders as a faint
 * pair-of-arrows glyph when the column is inactive (signalling that
 * sorting is available without screaming for attention), and as the
 * directional arrow once the column becomes the active sort key.
 */
function sortGlyph(active: boolean, dir: SortDir): string {
  if (!active) return "⇅";
  return dir === "asc" ? "▲" : "▼";
}

function SortIndicator({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <span aria-hidden="true" className={`text-[9px] ${active ? "text-text-secondary" : "text-text-disabled"}`}>
      {sortGlyph(active, dir)}
    </span>
  );
}

/**
 * Sortable column header. The whole `<th>` content is a `<button>`
 * so it's the single focusable element (no nested `tabIndex` with
 * the tooltip). The hover tooltip is driven by `useTooltip`,
 * which attaches the same mouseenter/leave + focus/blur handlers
 * directly to the button instead of wrapping a nested span.
 */
export function SortableHeader({
  sortKey,
  label,
  hint,
  currentKey,
  currentDir,
  onSort,
  align = "right"
}: {
  sortKey: SortKey;
  label: string;
  hint: string;
  currentKey: SortKey | null;
  currentDir: SortDir;
  onSort: (key: SortKey) => void;
  align?: "left" | "right";
}) {
  const active = currentKey === sortKey;
  const { ref, onMouseEnter, onMouseLeave, onFocus, onBlur, portal } = useTooltip(hint, {
    align: align === "right" ? "end" : "start"
  });

  return (
    <th scope="col" className={`px-3 py-1.5 ${align === "right" ? "text-right" : "text-left"} tabular-nums`}>
      <button
        ref={ref}
        type="button"
        onClick={() => {
          onSort(sortKey);
        }}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onFocus={onFocus}
        onBlur={onBlur}
        className={`inline-flex w-full items-center gap-1 ${align === "right" ? "justify-end" : "justify-start"} hover:text-text-secondary focus-visible:text-text-secondary cursor-pointer outline-none`}
      >
        <span className="decoration-text-disabled decoration-dotted underline-offset-2">{label}</span>
        <SortIndicator active={active} dir={currentDir} />
      </button>
      {portal}
    </th>
  );
}
