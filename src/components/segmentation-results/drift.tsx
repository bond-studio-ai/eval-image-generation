'use client';

import type { SegmentationCategoryMetadata } from '@/lib/segmentation-categories';
import { useMemo, useState } from 'react';
import { formatInt, formatNumber, formatPercent, formatPixels } from './format';
import { ChevronIcon, WarningIcon } from './icons';
import { Tooltip, useTooltip } from './tooltip';
import type {
  CategoryLookup,
  DriftAbsenceReason,
  DriftAssessment,
  DriftRow,
  DriftStatus,
  LargeObjectDriftMetrics,
  OverallDriftMetrics,
  SmallObjectDriftMetrics,
  SurfaceDriftMetrics,
} from './types';

function snakeToCamel(value: string): string {
  return value.replace(/_([a-z0-9])/g, (_, character: string) => character.toUpperCase());
}

/**
 * Build a category-key → group-metadata lookup so the drift row
 * tooltip can phrase its resolved SAM prompts. The
 * `categoryColors`-style maps the legacy modal used are gone; this
 * map ships group + prompt provenance per category.
 */
function indexGroupMetadata(
  entries: SegmentationCategoryMetadata[] | null,
): Map<string, SegmentationCategoryMetadata> {
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
  const promptByName = new Map(entry.groupPrompts.map((p) => [p.slug, p.prompt]));
  const promptNames = entry.resolvedPromptSlugs.map((slug) => promptByName.get(slug) ?? slug);
  // Multiple group members can fire the same SAM prompt string
  // (paints + wallpapers both send `Wall`); collapse adjacent
  // duplicates so the tooltip reads cleanly.
  const deduped: string[] = [];
  for (const name of promptNames) {
    if (deduped[deduped.length - 1] !== name) deduped.push(name);
  }
  if (entry.resolutionKind === 'union') {
    return deduped.length === 1 ? deduped[0]! : `${deduped.join(' + ')}`;
  }
  return deduped.join(' fallback ');
}

/**
 * Human-readable copy for the non-`computed` drift statuses the backend
 * can return on a fresh POST. Used as a hint inside the section when
 * drift couldn't be computed so the QA reviewer doesn't have to guess
 * why the metrics are missing.
 */
const DRIFT_STATUS_LABELS: Record<Exclude<DriftStatus, 'computed'>, string> = {
  no_dollhouse_view: 'No dollhouse view URL was set on this generation.',
  no_strategy_batch_run: 'Generation is not tied to a dollhouse batch run.',
  no_dollhouse_capture: 'No dollhouse capture was stored for this batch run.',
  no_product_mask: 'The matched dollhouse capture has no product mask.',
  no_sam_results: 'SAM did not return any masks to compare against.',
  failed: 'Drift computation raised an error — see the server logs.',
};

/**
 * Friendly copy for the `absent_in_*` reasons on a per-category metric
 * block. Tracked on the row itself so the UI can explain why a metric
 * is `null` without re-deriving it from the pixel counts.
 */
const DRIFT_ABSENCE_LABELS: Record<DriftAbsenceReason, string> = {
  absent_in_dollhouse: 'Not in dollhouse',
  absent_in_sam: 'Missed by SAM',
  absent_in_both: 'Not in either',
};

/**
 * Human-readable definitions for every drift metric the modal shows.
 * Centralized so the per-bucket headers and the overall card use the
 * same wording; if a reviewer asks "what does Area ratio mean?", it's
 * the same answer everywhere.
 */
const DRIFT_METRIC_HINTS = {
  iou: 'Intersection-over-Union: |SAM ∩ Dollhouse| / |SAM ∪ Dollhouse|. 1.00 = perfect overlap, 0 = no overlap.',
  centroid:
    'Euclidean distance (in pixels) between the SAM mask centroid and the dollhouse mask centroid. 0 = centroids coincide.',
  p95Symmetric:
    '95th-percentile symmetric Chamfer distance between mask boundaries, in pixels. Robust to a handful of outliers; lower is better.',
  p95Boundary:
    '95th-percentile symmetric Chamfer distance between surface boundaries, in pixels. Lower is better.',
  p95Small:
    '95th-percentile symmetric Chamfer distance between the aggregated SAM masks and the dollhouse mask for this category, in pixels.',
  areaRatio:
    'SAM mask area / dollhouse mask area. 1.00 = equal area, >1 = SAM is too big, <1 = SAM is too small.',
  pixelAccuracy:
    'Fraction of dollhouse pixels labeled with this category that SAM also assigned to it (per-class recall).',
  presence:
    '1 if SAM produced at least one mask for this category, 0 otherwise. Useful for accessories where size/shape vary a lot.',
  pixels:
    'Dollhouse pixel count / SAM pixel count for this category — context for the metric values to the left.',
  overallMse:
    'mismatched_pixels / total_pixels: the share of resized image pixels where SAM and the dollhouse map disagree on the category. 0 = perfect agreement.',
  overallPixelAccuracy:
    '1 − mismatched ratio: the share of pixels where SAM agrees with the dollhouse map.',
  overallRaw:
    'Raw mismatched-pixel count over total compared pixels (at the AI output resolution).',
} as const;

/**
 * Header label with a hover/focus explainer. The actual popover is a
 * portal-mounted `Tooltip` so it never widens the `<th>` or affects
 * column widths — the dotted underline is the only thing that lives
 * inline.
 */
function MetricLabel({ label, hint }: { label: string; hint: string }) {
  return (
    <Tooltip
      hint={hint}
      triggerClassName="decoration-gray-400 decoration-dotted underline-offset-2 hover:underline focus-within:underline"
    >
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
    <div className="rounded-md border border-gray-200 bg-white px-4 py-3">
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
        <div>
          <p className="text-[10px] font-semibold tracking-wide text-gray-500 uppercase">
            <MetricLabel label="Pixels mismatched" hint={DRIFT_METRIC_HINTS.overallMse} />
          </p>
          <p className="text-2xl font-semibold text-gray-900 tabular-nums">
            {formatPercent(overall.mse, 2)}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-semibold tracking-wide text-gray-500 uppercase">
            <MetricLabel label="Pixel accuracy" hint={DRIFT_METRIC_HINTS.overallPixelAccuracy} />
          </p>
          <p className="text-base font-medium text-gray-700 tabular-nums">
            {formatPercent(overall.pixelAccuracy, 2)}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-semibold tracking-wide text-gray-500 uppercase">
            <MetricLabel label="Mismatched / total" hint={DRIFT_METRIC_HINTS.overallRaw} />
          </p>
          <p className="text-base font-medium text-gray-700 tabular-nums">
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
function buildDriftRows(assessment: DriftAssessment): DriftRow[] {
  const include = (m: { dollhousePixelCount: number; samPixelCount: number }) =>
    m.dollhousePixelCount > 0 || m.samPixelCount > 0;
  const rows: DriftRow[] = [];
  for (const [key, metrics] of Object.entries(assessment.surfaces)) {
    if (include(metrics)) rows.push({ key, kind: 'surface', metrics });
  }
  for (const [key, metrics] of Object.entries(assessment.largeObjects)) {
    if (include(metrics)) rows.push({ key, kind: 'largeObject', metrics });
  }
  for (const [key, metrics] of Object.entries(assessment.smallObjects)) {
    if (include(metrics)) rows.push({ key, kind: 'smallObject', metrics });
  }
  return rows;
}

/** Faded em-dash for "this metric doesn't apply to this category".
 *  Visually distinct from the regular formatter dash (which means
 *  "metric applies but the value was null"). */
const NOT_APPLICABLE_CELL = <span className="text-gray-300">—</span>;

/**
 * Stable identifiers for every sortable column. Decoupled from the
 * underlying metric property names because two columns share the
 * "p95 distance" concept across different metric shapes
 * (`p95SymmetricDistancePx` for large objects, `p95DistancePx` for
 * small objects) and we want one sort key per column, not per shape.
 */
type SortKey =
  | 'category'
  | 'iou'
  | 'centroid'
  | 'p95'
  | 'areaRatio'
  | 'boundary'
  | 'pixelAccuracy'
  | 'presence'
  | 'pixels';

type SortDir = 'asc' | 'desc';

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
function getSortValue(row: DriftRow, key: SortKey, lookup: CategoryLookup): number | string | null {
  const { kind, metrics } = row;
  switch (key) {
    case 'category':
      return lookup.label(row.key).toLowerCase();
    case 'iou':
      if (kind === 'largeObject' || kind === 'surface')
        return (metrics as LargeObjectDriftMetrics | SurfaceDriftMetrics).iou;
      return null;
    case 'centroid':
      if (kind === 'largeObject' || kind === 'smallObject')
        return (metrics as LargeObjectDriftMetrics | SmallObjectDriftMetrics).centroidDriftPx;
      return null;
    case 'p95':
      if (kind === 'largeObject')
        return (metrics as LargeObjectDriftMetrics).p95SymmetricDistancePx;
      if (kind === 'smallObject') return (metrics as SmallObjectDriftMetrics).p95DistancePx;
      return null;
    case 'areaRatio':
      if (kind === 'largeObject') return (metrics as LargeObjectDriftMetrics).areaRatio;
      return null;
    case 'boundary':
      if (kind === 'surface') return (metrics as SurfaceDriftMetrics).boundaryDriftPx;
      return null;
    case 'pixelAccuracy':
      if (kind === 'surface') return (metrics as SurfaceDriftMetrics).pixelClassAccuracy;
      return null;
    case 'presence':
      if (kind === 'smallObject') return (metrics as SmallObjectDriftMetrics).presence;
      return null;
    case 'pixels':
      return metrics.dollhousePixelCount;
  }
}

function compareSortValues(
  a: number | string | null,
  b: number | string | null,
  dir: SortDir,
): number {
  // `null` (column doesn't apply to this row) always lands at the end,
  // independent of asc/desc — sorting on a column the row doesn't have
  // a value for is never useful information.
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  const raw =
    typeof a === 'string' && typeof b === 'string'
      ? a.localeCompare(b)
      : (a as number) - (b as number);
  return dir === 'desc' ? -raw : raw;
}

/**
 * Sort indicator next to a sortable header. Renders as a faint
 * pair-of-arrows glyph when the column is inactive (signalling that
 * sorting is available without screaming for attention), and as the
 * directional arrow once the column becomes the active sort key.
 */
function SortIndicator({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <span aria-hidden="true" className={`text-[9px] ${active ? 'text-gray-700' : 'text-gray-300'}`}>
      {active ? (dir === 'asc' ? '▲' : '▼') : '⇅'}
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
function SortableHeader({
  sortKey,
  label,
  hint,
  currentKey,
  currentDir,
  onSort,
  align = 'right',
}: {
  sortKey: SortKey;
  label: string;
  hint: string;
  currentKey: SortKey | null;
  currentDir: SortDir;
  onSort: (key: SortKey) => void;
  align?: 'left' | 'right';
}) {
  const active = currentKey === sortKey;
  const { ref, onMouseEnter, onMouseLeave, onFocus, onBlur, portal } = useTooltip(hint, {
    align: align === 'right' ? 'end' : 'start',
  });

  return (
    <th
      scope="col"
      className={`px-3 py-1.5 ${align === 'right' ? 'text-right' : 'text-left'} tabular-nums`}
    >
      <button
        ref={ref}
        type="button"
        onClick={() => onSort(sortKey)}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onFocus={onFocus}
        onBlur={onBlur}
        className={`inline-flex w-full items-center gap-1 ${align === 'right' ? 'justify-end' : 'justify-start'} cursor-pointer outline-none hover:text-gray-700 focus-visible:text-gray-700`}
      >
        <span className="decoration-gray-400 decoration-dotted underline-offset-2">{label}</span>
        <SortIndicator active={active} dir={currentDir} />
      </button>
      {portal}
    </th>
  );
}

function DriftUnifiedRow({
  row,
  lookup,
  groupMetadata,
}: {
  row: DriftRow;
  lookup: CategoryLookup;
  groupMetadata: Map<string, SegmentationCategoryMetadata>;
}) {
  const { kind, metrics, key } = row;
  const label = lookup.label(key);
  const swatch = lookup.color(key);
  const entry = groupMetadata.get(key) ?? null;
  const groupHint = entry
    ? `${key} → ${resolutionLabel(entry)}${entry.group !== key ? ` (group ${entry.group})` : ''}`
    : null;

  // Each `applies*` flag controls whether this column renders a value
  // for the current row's bucket. Inapplicable cells render the muted
  // dash from `NOT_APPLICABLE_CELL` so they don't compete visually
  // with the formatter's regular "—" for a real null metric.
  const appliesIoU = kind === 'largeObject' || kind === 'surface';
  const appliesCentroid = kind === 'largeObject' || kind === 'smallObject';
  const appliesP95 = kind === 'largeObject' || kind === 'smallObject';
  const appliesAreaRatio = kind === 'largeObject';
  const appliesBoundary = kind === 'surface';
  const appliesPixelClass = kind === 'surface';
  const appliesPresence = kind === 'smallObject';

  const iouCell = appliesIoU
    ? formatNumber((metrics as LargeObjectDriftMetrics | SurfaceDriftMetrics).iou, 3)
    : null;
  const centroidCell = appliesCentroid
    ? formatPixels((metrics as LargeObjectDriftMetrics | SmallObjectDriftMetrics).centroidDriftPx)
    : null;
  // The two p95 fields use different property names (`p95SymmetricDistancePx`
  // for large objects, `p95DistancePx` for small) but represent the same
  // symmetric Chamfer distance — collapse them into one column.
  const p95Pixels =
    kind === 'largeObject'
      ? (metrics as LargeObjectDriftMetrics).p95SymmetricDistancePx
      : kind === 'smallObject'
        ? (metrics as SmallObjectDriftMetrics).p95DistancePx
        : null;
  const p95Cell = appliesP95 ? formatPixels(p95Pixels) : null;
  const areaRatioCell = appliesAreaRatio
    ? formatNumber((metrics as LargeObjectDriftMetrics).areaRatio, 2)
    : null;
  const boundaryCell = appliesBoundary
    ? formatPixels((metrics as SurfaceDriftMetrics).boundaryDriftPx)
    : null;
  const pixelClassCell = appliesPixelClass
    ? formatPercent((metrics as SurfaceDriftMetrics).pixelClassAccuracy, 1)
    : null;

  return (
    <tr className="align-top">
      <td className="px-3 py-1.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm ring-1 ring-gray-300"
            style={{ backgroundColor: swatch }}
            aria-hidden="true"
          />
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
            <Tooltip
              hint={DRIFT_ABSENCE_LABELS[metrics.absenceReason]}
              width={200}
              triggerClassName="ml-1 shrink-0 items-center"
            >
              <WarningIcon className="h-3.5 w-3.5 text-amber-500" />
              <span className="sr-only">{DRIFT_ABSENCE_LABELS[metrics.absenceReason]}</span>
            </Tooltip>
          )}
        </div>
      </td>
      <td className="px-3 py-1.5 text-right tabular-nums">{iouCell ?? NOT_APPLICABLE_CELL}</td>
      <td className="px-3 py-1.5 text-right tabular-nums">{centroidCell ?? NOT_APPLICABLE_CELL}</td>
      <td className="px-3 py-1.5 text-right tabular-nums">{p95Cell ?? NOT_APPLICABLE_CELL}</td>
      <td className="px-3 py-1.5 text-right tabular-nums">
        {areaRatioCell ?? NOT_APPLICABLE_CELL}
      </td>
      <td className="px-3 py-1.5 text-right tabular-nums">{boundaryCell ?? NOT_APPLICABLE_CELL}</td>
      <td className="px-3 py-1.5 text-right tabular-nums">
        {pixelClassCell ?? NOT_APPLICABLE_CELL}
      </td>
      <td className="px-3 py-1.5 text-right">
        {appliesPresence ? (
          (metrics as SmallObjectDriftMetrics).presence === 1 ? (
            <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 tabular-nums ring-1 ring-emerald-200">
              1
            </span>
          ) : (
            <span className="rounded bg-gray-50 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500 tabular-nums ring-1 ring-gray-200">
              0
            </span>
          )
        ) : (
          NOT_APPLICABLE_CELL
        )}
      </td>
      <td className="px-3 py-1.5 text-right text-gray-500 tabular-nums">
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
function DriftUnifiedTable({
  assessment,
  lookup,
  categories,
}: {
  assessment: DriftAssessment;
  lookup: CategoryLookup;
  categories: SegmentationCategoryMetadata[] | null;
}) {
  const rows = useMemo(() => buildDriftRows(assessment), [assessment]);
  const groupMetadata = useMemo(() => indexGroupMetadata(categories), [categories]);

  // Sort + filter UI state. `null` sort key keeps the natural bucket
  // ordering (surfaces → large → small) the backend ships, which is
  // what reviewers see first; clicking a header opts into sort.
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [filter, setFilter] = useState('');

  function handleSort(key: SortKey) {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir('desc');
      return;
    }
    // Toggle desc → asc → unsorted. Three states make the active sort
    // dismissable without forcing the user to click a separate
    // "clear" button.
    if (sortDir === 'desc') {
      setSortDir('asc');
    } else {
      setSortKey(null);
      setSortDir('desc');
    }
  }

  const visibleRows = useMemo(() => {
    const q = filter.trim().toLowerCase();
    let filtered = rows;
    if (q.length > 0) {
      filtered = rows.filter(
        (row) =>
          lookup.label(row.key).toLowerCase().includes(q) || row.key.toLowerCase().includes(q),
      );
    }
    if (sortKey !== null) {
      const key = sortKey;
      const dir = sortDir;
      filtered = [...filtered].sort((a, b) =>
        compareSortValues(getSortValue(a, key, lookup), getSortValue(b, key, lookup), dir),
      );
    }
    return filtered;
  }, [rows, filter, sortKey, sortDir, lookup]);

  if (rows.length === 0) return null;

  return (
    <div className="rounded-md border border-gray-200 bg-white">
      <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-3 py-2">
        <p className="text-xs font-semibold text-gray-700">Per-category drift</p>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Filter categories…"
            className="w-40 rounded border border-gray-200 bg-white px-2 py-0.5 text-[11px] text-gray-700 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none"
            aria-label="Filter drift rows by category"
          />
          <p className="text-[10px] text-gray-500 tabular-nums">
            {visibleRows.length === rows.length
              ? `${rows.length} ${rows.length === 1 ? 'category' : 'categories'}`
              : `${visibleRows.length} / ${rows.length}`}
          </p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead className="bg-gray-50 text-left text-[10px] font-semibold tracking-wide text-gray-500 uppercase">
            <tr>
              <SortableHeader
                sortKey="category"
                label="Category"
                hint="Product type. Surfaces, large fixtures, then small objects by default."
                currentKey={sortKey}
                currentDir={sortDir}
                onSort={handleSort}
                align="left"
              />
              <SortableHeader
                sortKey="iou"
                label="IoU"
                hint={DRIFT_METRIC_HINTS.iou}
                currentKey={sortKey}
                currentDir={sortDir}
                onSort={handleSort}
              />
              <SortableHeader
                sortKey="centroid"
                label="Centroid"
                hint={DRIFT_METRIC_HINTS.centroid}
                currentKey={sortKey}
                currentDir={sortDir}
                onSort={handleSort}
              />
              <SortableHeader
                sortKey="p95"
                label="p95"
                hint={DRIFT_METRIC_HINTS.p95Symmetric}
                currentKey={sortKey}
                currentDir={sortDir}
                onSort={handleSort}
              />
              <SortableHeader
                sortKey="areaRatio"
                label="Area"
                hint={DRIFT_METRIC_HINTS.areaRatio}
                currentKey={sortKey}
                currentDir={sortDir}
                onSort={handleSort}
              />
              <SortableHeader
                sortKey="boundary"
                label="Boundary"
                hint={DRIFT_METRIC_HINTS.p95Boundary}
                currentKey={sortKey}
                currentDir={sortDir}
                onSort={handleSort}
              />
              <SortableHeader
                sortKey="pixelAccuracy"
                label="Acc."
                hint={DRIFT_METRIC_HINTS.pixelAccuracy}
                currentKey={sortKey}
                currentDir={sortDir}
                onSort={handleSort}
              />
              <SortableHeader
                sortKey="presence"
                label="Present"
                hint={DRIFT_METRIC_HINTS.presence}
                currentKey={sortKey}
                currentDir={sortDir}
                onSort={handleSort}
              />
              <SortableHeader
                sortKey="pixels"
                label="Px D/S"
                hint={DRIFT_METRIC_HINTS.pixels}
                currentKey={sortKey}
                currentDir={sortDir}
                onSort={handleSort}
              />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-gray-700">
            {visibleRows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-4 text-center text-[11px] text-gray-500 italic">
                  No categories match{filter ? ` "${filter}"` : ''}.
                </td>
              </tr>
            ) : (
              visibleRows.map((row) => (
                <DriftUnifiedRow
                  key={`${row.kind}:${row.key}`}
                  row={row}
                  lookup={lookup}
                  groupMetadata={groupMetadata}
                />
              ))
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
export function CollapsibleDrift({
  assessment,
  status,
  lookup,
  categories,
}: {
  assessment: DriftAssessment | null;
  status: DriftStatus | null;
  lookup: CategoryLookup;
  categories: SegmentationCategoryMetadata[] | null;
}) {
  const [open, setOpen] = useState(false);
  const overall = assessment?.overall ?? null;
  const computed = !!assessment && (status === null || status === 'computed');

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
            Drift assessment
          </span>
          {computed && assessment && (
            <span className="text-[11px] font-normal text-gray-500">
              {assessment.imageWidth}×{assessment.imageHeight}
            </span>
          )}
        </span>
        <span className="text-[11px] tabular-nums">
          {computed && overall ? (
            <span className="text-gray-700">
              <span className="font-semibold">{formatPercent(overall.mse, 2)}</span>{' '}
              <span className="text-gray-500">mismatched</span>
            </span>
          ) : (
            <span className="text-gray-500">unavailable</span>
          )}
        </span>
      </button>
      {open && (
        <div className="mt-2 space-y-3">
          {!computed && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
              {status && status !== 'computed' && DRIFT_STATUS_LABELS[status]
                ? DRIFT_STATUS_LABELS[status]
                : 'Drift assessment is not available for this segmentation row.'}
            </div>
          )}
          {computed && assessment && overall && (
            <>
              <DriftOverallCard overall={overall} />
              <DriftUnifiedTable assessment={assessment} lookup={lookup} categories={categories} />
              {assessment.failedSamMaskUrls && assessment.failedSamMaskUrls.length > 0 && (
                <p className="px-1 text-[10px] text-gray-500 italic">
                  {assessment.failedSamMaskUrls.length} SAM mask
                  {assessment.failedSamMaskUrls.length === 1 ? '' : 's'} failed to download —
                  metrics may understate SAM coverage.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
