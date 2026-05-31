"use client";

import { useMemo, useState } from "react";
import type { SegmentationCategoryMetadata } from "@/lib/segmentation-categories";
import { NOT_APPLICABLE_CELL, SortableHeader } from "./drift-sorting";
import { compareSortValues, getSortValue, type SortDir, type SortKey } from "./drift-sorting-utils";
import { formatInt, formatNumber, formatPercent, formatPixels } from "./format";
import { ChevronIcon, WarningIcon } from "./icons";
import { Tooltip } from "./tooltip";
import type { CategoryLookup, DriftAbsenceReason, DriftAssessment, DriftRow, DriftStatus, LargeObjectDriftMetrics, OverallDriftMetrics, SmallObjectDriftMetrics, SurfaceDriftMetrics } from "./types";

function snakeToCamel(value: string): string {
  return value.replaceAll(/_([a-z0-9])/g, (_, character: string) => character.toUpperCase());
}

/**
 * Build a category-key → group-metadata lookup so the drift row
 * tooltip can phrase its resolved SAM prompts. The
 * `categoryColors`-style maps the legacy modal used are gone; this
 * map ships group + prompt provenance per category.
 */
function indexGroupMetadata(entries: SegmentationCategoryMetadata[] | null): Map<string, SegmentationCategoryMetadata> {
  const map = new Map<string, SegmentationCategoryMetadata>();
  if (!entries) return map;
  for (const entry of entries) {
    map.set(entry.key, entry);
    const camel = snakeToCamel(entry.key);
    if (camel !== entry.key) map.set(camel, entry);
  }
  return map;
}

/**
 * Phrase a member's resolved SAM prompts: `union(['Toilet', 'Toilet
 * Flusher'])` or `Wainscoting fallback Wall`. The legacy modal used
 * to hard-code the rule; now the API ships `resolutionKind` so the
 * tooltip stays in sync with the backend even when the rules change.
 */
function resolutionLabel(entry: SegmentationCategoryMetadata): string {
  const promptByName = new Map(entry.groupPrompts.map((groupPrompt) => [groupPrompt.slug, groupPrompt.prompt]));
  const promptNames = entry.resolvedPromptSlugs.map((slug) => promptByName.get(slug) ?? slug);
  // Multiple group members can fire the same SAM prompt string
  // (paints + wallpapers both send `Wall`); collapse adjacent
  // duplicates so the tooltip reads cleanly.
  const deduped: string[] = [];
  for (const name of promptNames) {
    if (deduped.at(-1) !== name) deduped.push(name);
  }
  if (entry.resolutionKind === "union") {
    return deduped.length === 1 ? deduped[0]! : deduped.join(" + ");
  }
  return deduped.join(" fallback ");
}

/**
 * Human-readable copy for the non-`computed` drift statuses the backend
 * can return on a fresh POST. Used as a hint inside the section when
 * drift couldn't be computed so the QA reviewer doesn't have to guess
 * why the metrics are missing.
 */
const DRIFT_STATUS_LABELS: Record<Exclude<DriftStatus, "computed">, string> = {
  no_dollhouse_view: "No dollhouse view URL was set on this generation.",
  no_strategy_batch_run: "Generation is not tied to a dollhouse batch run.",
  no_dollhouse_capture: "No dollhouse capture was stored for this batch run.",
  no_product_mask: "The matched dollhouse capture has no product mask.",
  no_sam_results: "SAM did not return any masks to compare against.",
  failed: "Drift computation raised an error — see the server logs."
};

/**
 * Friendly copy for the `absent_in_*` reasons on a per-category metric
 * block. Tracked on the row itself so the UI can explain why a metric
 * is `null` without re-deriving it from the pixel counts.
 */
const DRIFT_ABSENCE_LABELS: Record<DriftAbsenceReason, string> = {
  absent_in_dollhouse: "Not in dollhouse",
  absent_in_sam: "Missed by SAM",
  absent_in_both: "Not in either"
};

/**
 * Human-readable definitions for every drift metric the modal shows.
 * Centralized so the per-bucket headers and the overall card use the
 * same wording; if a reviewer asks "what does Area ratio mean?", it's
 * the same answer everywhere.
 */
const DRIFT_METRIC_HINTS = {
  iou: "Intersection-over-Union: |SAM ∩ Dollhouse| / |SAM ∪ Dollhouse|. 1.00 = perfect overlap, 0 = no overlap.",
  centroid: "Euclidean distance (in pixels) between the SAM mask centroid and the dollhouse mask centroid. 0 = centroids coincide.",
  p95Symmetric: "95th-percentile symmetric Chamfer distance between mask boundaries, in pixels. Robust to a handful of outliers; lower is better.",
  p95Boundary: "95th-percentile symmetric Chamfer distance between surface boundaries, in pixels. Lower is better.",
  p95Small: "95th-percentile symmetric Chamfer distance between the aggregated SAM masks and the dollhouse mask for this category, in pixels.",
  areaRatio: "SAM mask area / dollhouse mask area. 1.00 = equal area, >1 = SAM is too big, <1 = SAM is too small.",
  pixelAccuracy: "Fraction of dollhouse pixels labeled with this category that the SAM mask for this specific category covered (per-class recall against just this prompt).",
  presence: "1 if SAM produced at least one mask for this category, 0 otherwise. Useful for accessories where size/shape vary a lot.",
  pixels: "Dollhouse pixel count / SAM pixel count for this category — context for the metric values to the left.",
  productMaskCoverage:
    "Share of dollhouse pixels for this category that ANY member of its concept group covered in SAM (e.g. paint pixels can be matched by paint, wallpaper, wainscoting, or shower-wall-tile SAM masks — they all describe the same surface). This is the headline accuracy signal: 100% means the surface was correctly identified, regardless of which group member name SAM used.",
  overallMse:
    "Dollhouse-pixel mismatch rate, concept-group aware: the share of dollhouse-labeled pixels NOT covered by their concept group's SAM union. Background is excluded from both numerator and denominator. 0 = every labeled pixel was recognized as the right surface (or a synonymous one).",
  overallPixelAccuracy: "1 − mismatched ratio: the share of dollhouse-labeled pixels recognized by some member of their concept group.",
  overallRaw: "Mismatched dollhouse-labeled pixels over total dollhouse-labeled pixels (background excluded)."
} as const;

/**
 * Header label with a hover/focus explainer. The actual popover is a
 * portal-mounted `Tooltip` so it never widens the `<th>` or affects
 * column widths — the dotted underline is the only thing that lives
 * inline.
 */
function MetricLabel({ label, hint }: { label: string; hint: string }) {
  return (
    <Tooltip hint={hint} triggerClassName="decoration-text-disabled decoration-dotted underline-offset-2 hover:underline focus-within:underline">
      {label}
    </Tooltip>
  );
}

/**
 * Headline overall MSE card — the user explicitly asked for this to
 * be prominent, so it lives above the per-bucket tables and is the
 * first thing visible when the drift section is expanded.
 */
function DriftOverallCard({ overall }: { overall: OverallDriftMetrics }) {
  return (
    <div className="border-border bg-surface rounded-md border px-4 py-3">
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
        <div>
          <p className="text-text-muted text-[10px] font-semibold tracking-wide uppercase">
            <MetricLabel label="Pixels mismatched" hint={DRIFT_METRIC_HINTS.overallMse} />
          </p>
          <p className="text-text-primary text-display tabular-nums">{formatPercent(overall.mse, 2)}</p>
        </div>
        <div>
          <p className="text-text-muted text-[10px] font-semibold tracking-wide uppercase">
            <MetricLabel label="Pixel accuracy" hint={DRIFT_METRIC_HINTS.overallPixelAccuracy} />
          </p>
          <p className="text-text-secondary text-body-lg font-medium tabular-nums">{formatPercent(overall.pixelAccuracy, 2)}</p>
        </div>
        <div>
          <p className="text-text-muted text-[10px] font-semibold tracking-wide uppercase">
            <MetricLabel label="Mismatched / total" hint={DRIFT_METRIC_HINTS.overallRaw} />
          </p>
          <p className="text-text-secondary text-body-lg font-medium tabular-nums">
            {formatInt(overall.numMismatched)} / {formatInt(overall.totalPixels)}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Flatten the three per-bucket records into a single ordered row list.
 *
 * - Row ordering is `surface → largeObject → smallObject`: the room
 *   shell (walls / floor / ceiling) frames every reading below it,
 *   large fixtures come next, and accessories finish at the bottom.
 * - Rows where neither the dollhouse map nor SAM produced any pixels
 *   (`absent_in_both`) are dropped: they exist in the backend payload
 *   only to keep the bucket schema dense, and showing them just
 *   dilutes the actually-interesting drift.
 */
function hasDriftPixels(metrics: { dollhousePixelCount: number; samPixelCount: number }): boolean {
  return metrics.dollhousePixelCount > 0 || metrics.samPixelCount > 0;
}

function buildDriftRows(assessment: DriftAssessment): DriftRow[] {
  const include = hasDriftPixels;
  const rows: DriftRow[] = [];
  for (const [key, metrics] of Object.entries(assessment.surfaces)) {
    if (include(metrics)) rows.push({ key, kind: "surface", metrics });
  }
  for (const [key, metrics] of Object.entries(assessment.largeObjects)) {
    if (include(metrics)) rows.push({ key, kind: "largeObject", metrics });
  }
  for (const [key, metrics] of Object.entries(assessment.smallObjects)) {
    if (include(metrics)) rows.push({ key, kind: "smallObject", metrics });
  }
  return rows;
}

/** Faded dash for "this metric doesn't apply to this category".
 *  Visually distinct from the regular formatter dash (which means
 *  "metric applies but the value was null"). */
function DriftUnifiedRow({ row, lookup, groupMetadata }: { row: DriftRow; lookup: CategoryLookup; groupMetadata: Map<string, SegmentationCategoryMetadata> }) {
  const { kind, metrics, key } = row;
  const label = lookup.label(key);
  const swatch = lookup.color(key);
  const entry = groupMetadata.get(key) ?? null;
  const groupSuffix = entry && entry.group !== key ? ` (group ${entry.group})` : "";
  const groupHint = entry ? `${key} → ${resolutionLabel(entry)}${groupSuffix}` : null;

  // Each `applies*` flag controls whether this column renders a value
  // for the current row's bucket. Inapplicable cells render the muted
  // dash from `NOT_APPLICABLE_CELL` so they don't compete visually
  // with the formatter's regular "—" for a real null metric.
  const appliesIoU = kind === "largeObject" || kind === "surface";
  const appliesCentroid = kind === "largeObject" || kind === "smallObject";
  const appliesP95 = kind === "largeObject" || kind === "smallObject";
  const appliesAreaRatio = kind === "largeObject";
  const appliesBoundary = kind === "surface";
  const appliesPixelClass = kind === "surface";
  const appliesPresence = kind === "smallObject";

  // Concept-group-aware coverage is the new headline signal: how
  // much of the dollhouse mask for this category did *any* member of
  // its group cover. Rendered with the matched/total raw counts in a
  // tooltip so the reviewer can audit the recall without leaving the
  // table.
  const coverageMetric = metrics.productMaskCoverage;
  const coverageCell = coverageMetric ? formatPercent(coverageMetric.recall, 1) : null;
  const coverageHint = coverageMetric ? `${formatInt(coverageMetric.matchedPixels)} / ${formatInt(coverageMetric.dollhousePixels)} dollhouse-labeled pixels covered by the concept group's SAM union.` : null;

  const iouCell = appliesIoU ? formatNumber((metrics as LargeObjectDriftMetrics | SurfaceDriftMetrics).iou, 3) : null;
  const centroidCell = appliesCentroid ? formatPixels((metrics as LargeObjectDriftMetrics | SmallObjectDriftMetrics).centroidDriftPx) : null;
  // The two p95 fields use different property names (`p95SymmetricDistancePx`
  // for large objects, `p95DistancePx` for small) but represent the same
  // symmetric Chamfer distance — collapse them into one column.
  let p95Pixels: number | null = null;
  if (kind === "largeObject") p95Pixels = (metrics as LargeObjectDriftMetrics).p95SymmetricDistancePx;
  else if (kind === "smallObject") p95Pixels = (metrics as SmallObjectDriftMetrics).p95DistancePx;
  const p95Cell = appliesP95 ? formatPixels(p95Pixels) : null;
  const areaRatioCell = appliesAreaRatio ? formatNumber((metrics as LargeObjectDriftMetrics).areaRatio, 2) : null;
  const boundaryCell = appliesBoundary ? formatPixels((metrics as SurfaceDriftMetrics).boundaryDriftPx) : null;
  const pixelClassCell = appliesPixelClass ? formatPercent((metrics as SurfaceDriftMetrics).pixelClassAccuracy, 1) : null;

  return (
    <tr className="align-top">
      <td className="px-3 py-1.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="ring-border-strong inline-block size-2.5 shrink-0 rounded-sm ring-1" style={{ backgroundColor: swatch }} aria-hidden="true" />
          {groupHint ? (
            <Tooltip hint={groupHint} width={260} triggerClassName="min-w-0">
              <span className="truncate" title={label}>
                {label}
              </span>
            </Tooltip>
          ) : (
            <span className="truncate" title={label}>
              {label}
            </span>
          )}
          {metrics.absenceReason && (
            <Tooltip hint={DRIFT_ABSENCE_LABELS[metrics.absenceReason]} width={200} triggerClassName="ml-1 shrink-0 items-center">
              <WarningIcon className="text-warning-500 size-3.5" />
              <span className="sr-only">{DRIFT_ABSENCE_LABELS[metrics.absenceReason]}</span>
            </Tooltip>
          )}
        </div>
      </td>
      <td className="px-3 py-1.5 text-right tabular-nums">
        {coverageCell && coverageHint ? (
          <Tooltip hint={coverageHint} width={260} triggerClassName="inline-flex">
            <span>{coverageCell}</span>
          </Tooltip>
        ) : null}
        {coverageCell && !coverageHint ? coverageCell : null}
        {coverageCell ? null : NOT_APPLICABLE_CELL}
      </td>
      <td className="px-3 py-1.5 text-right tabular-nums">{iouCell ?? NOT_APPLICABLE_CELL}</td>
      <td className="px-3 py-1.5 text-right tabular-nums">{centroidCell ?? NOT_APPLICABLE_CELL}</td>
      <td className="px-3 py-1.5 text-right tabular-nums">{p95Cell ?? NOT_APPLICABLE_CELL}</td>
      <td className="px-3 py-1.5 text-right tabular-nums">{areaRatioCell ?? NOT_APPLICABLE_CELL}</td>
      <td className="px-3 py-1.5 text-right tabular-nums">{boundaryCell ?? NOT_APPLICABLE_CELL}</td>
      <td className="px-3 py-1.5 text-right tabular-nums">{pixelClassCell ?? NOT_APPLICABLE_CELL}</td>
      <td className="px-3 py-1.5 text-right">
        {appliesPresence ? null : NOT_APPLICABLE_CELL}
        {appliesPresence && (metrics as SmallObjectDriftMetrics).presence === 1 ? <span className="bg-success-50 text-success-700 ring-success-200 rounded px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ring-1">1</span> : null}
        {appliesPresence && (metrics as SmallObjectDriftMetrics).presence !== 1 ? <span className="bg-surface-muted text-text-muted ring-border rounded px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ring-1">0</span> : null}
      </td>
      <td className="text-text-muted px-3 py-1.5 text-right tabular-nums">
        {formatInt(metrics.dollhousePixelCount)} / {formatInt(metrics.samPixelCount)}
      </td>
    </tr>
  );
}

/**
 * Single unified drift table. Every applicable metric across the three
 * buckets (large object / surface / small object) is a column;
 * non-applicable cells render the muted dash above so the reader can
 * tell at a glance that the cell is intentionally blank for this
 * category type rather than missing data.
 *
 * Click any header to sort by that column (asc → desc → unsorted);
 * non-applicable cells always sink to the bottom regardless of
 * direction. The text input filters rows by category label.
 *
 * Headers are intentionally terse — full definitions live in the
 * portal tooltip on hover/focus so reviewers can fit all nine columns
 * on a single screen.
 *
 * Returns `null` if every row was filtered out as `absent_in_both`,
 * so the section disappears entirely on a generation with no
 * comparable categories.
 */
function DriftUnifiedTable({ assessment, lookup, categories }: { assessment: DriftAssessment; lookup: CategoryLookup; categories: SegmentationCategoryMetadata[] | null }) {
  const rows = useMemo(() => buildDriftRows(assessment), [assessment]);
  const groupMetadata = useMemo(() => indexGroupMetadata(categories), [categories]);

  // Sort + filter UI state. `null` sort key keeps the natural bucket
  // ordering (surfaces → large → small) the backend ships, which is
  // what reviewers see first; clicking a header opts into sort.
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [filter, setFilter] = useState("");

  function handleSort(key: SortKey) {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir("desc");
      return;
    }
    // Toggle desc → asc → unsorted. Three states make the active sort
    // dismissable without forcing the user to click a separate
    // "clear" button.
    if (sortDir === "desc") {
      setSortDir("asc");
    } else {
      setSortKey(null);
      setSortDir("desc");
    }
  }

  const visibleRows = useMemo(() => {
    const query = filter.trim().toLowerCase();
    let filtered = rows;
    if (query.length > 0) {
      filtered = rows.filter((row) => lookup.label(row.key).toLowerCase().includes(query) || row.key.toLowerCase().includes(query));
    }
    if (sortKey !== null) {
      const key = sortKey;
      const dir = sortDir;
      filtered = filtered.toSorted((a, b) => compareSortValues(getSortValue(a, key, lookup), getSortValue(b, key, lookup), dir));
    }
    return filtered;
  }, [rows, filter, sortKey, sortDir, lookup]);

  if (rows.length === 0) return null;

  return (
    <div className="border-border bg-surface rounded-md border">
      <div className="border-border-subtle flex items-center justify-between gap-2 border-b px-3 py-2">
        <p className="text-text-secondary text-caption font-semibold">Per-category drift</p>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={filter}
            onChange={(event) => {
              setFilter(event.target.value);
            }}
            placeholder="Filter categories…"
            className="border-border bg-surface text-text-secondary placeholder:text-text-disabled focus:border-border-strong w-40 rounded border px-2 py-0.5 text-[11px] focus:outline-none"
            aria-label="Filter drift rows by category"
          />
          <p className="text-text-muted text-[10px] tabular-nums">{visibleRows.length === rows.length ? `${rows.length} ${rows.length === 1 ? "category" : "categories"}` : `${visibleRows.length} / ${rows.length}`}</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead className="bg-surface-muted text-text-muted text-left text-[10px] font-semibold tracking-wide uppercase">
            <tr>
              <SortableHeader sortKey="category" label="Category" hint="Product type. Surfaces, large fixtures, then small objects by default." currentKey={sortKey} currentDir={sortDir} onSort={handleSort} align="left" />
              <SortableHeader sortKey="coverage" label="Coverage" hint={DRIFT_METRIC_HINTS.productMaskCoverage} currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
              <SortableHeader sortKey="iou" label="IoU" hint={DRIFT_METRIC_HINTS.iou} currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
              <SortableHeader sortKey="centroid" label="Centroid" hint={DRIFT_METRIC_HINTS.centroid} currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
              <SortableHeader sortKey="p95" label="p95" hint={DRIFT_METRIC_HINTS.p95Symmetric} currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
              <SortableHeader sortKey="areaRatio" label="Area" hint={DRIFT_METRIC_HINTS.areaRatio} currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
              <SortableHeader sortKey="boundary" label="Boundary" hint={DRIFT_METRIC_HINTS.p95Boundary} currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
              <SortableHeader sortKey="pixelAccuracy" label="Acc." hint={DRIFT_METRIC_HINTS.pixelAccuracy} currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
              <SortableHeader sortKey="presence" label="Present" hint={DRIFT_METRIC_HINTS.presence} currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
              <SortableHeader sortKey="pixels" label="Px D/S" hint={DRIFT_METRIC_HINTS.pixels} currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
            </tr>
          </thead>
          <tbody className="divide-border-subtle text-text-secondary divide-y">
            {visibleRows.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-text-muted px-3 py-4 text-center text-[11px] italic">
                  No categories match{filter ? ` "${filter}"` : ""}.
                </td>
              </tr>
            ) : (
              visibleRows.map((row) => <DriftUnifiedRow key={`${row.kind}:${row.key}`} row={row} lookup={lookup} groupMetadata={groupMetadata} />)
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Collapsible drift section. Header summarizes the overall MSE so the
 * reviewer sees the headline number without expanding; the body shows
 * an overall card plus a single per-category table so they can
 * attribute the drift to a specific product type.
 *
 * When drift couldn't be computed (`status !== 'computed'` and no
 * `assessment`), we still render the header so reviewers know the
 * field was attempted and surface the reason inside.
 */
export function CollapsibleDrift({ assessment, status, lookup, categories }: { assessment: DriftAssessment | null; status: DriftStatus | null; lookup: CategoryLookup; categories: SegmentationCategoryMetadata[] | null }) {
  const [open, setOpen] = useState(false);
  const overall = assessment?.overall ?? null;
  const computed = Boolean(assessment) && (status === null || status === "computed");

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
          <ChevronIcon className={`text-text-muted size-3.5 transition-transform ${open ? "rotate-90" : ""}`} />
          <span className="text-text-secondary text-caption font-semibold tracking-wide uppercase">Drift assessment</span>
          {computed && assessment && (
            <span className="text-text-muted text-[11px] font-normal">
              {assessment.imageWidth}×{assessment.imageHeight}
            </span>
          )}
        </span>
        <span className="text-[11px] tabular-nums">
          {computed && overall ? (
            <span className="text-text-secondary">
              <span className="font-semibold">{formatPercent(overall.mse, 2)}</span> <span className="text-text-muted">mismatched</span>
            </span>
          ) : (
            <span className="text-text-muted">unavailable</span>
          )}
        </span>
      </button>
      {open && (
        <div className="mt-2 space-y-3">
          {!computed && (
            <div className="border-warning-200 bg-warning-50 text-warning-800 rounded-md border px-3 py-2 text-[11px]">
              {status && status !== "computed" && DRIFT_STATUS_LABELS[status] ? DRIFT_STATUS_LABELS[status] : "Drift assessment is not available for this segmentation row."}
            </div>
          )}
          {computed && assessment && overall && (
            <>
              <DriftOverallCard overall={overall} />
              <DriftUnifiedTable assessment={assessment} lookup={lookup} categories={categories} />
              {assessment.failedSamMaskUrls && assessment.failedSamMaskUrls.length > 0 && (
                <p className="text-text-muted px-1 text-[10px] italic">
                  {assessment.failedSamMaskUrls.length} SAM mask
                  {assessment.failedSamMaskUrls.length === 1 ? "" : "s"} failed to download; metrics may understate SAM coverage.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
