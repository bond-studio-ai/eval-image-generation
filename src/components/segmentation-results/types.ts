/**
 * Type definitions shared across the segmentation results modal pieces.
 *
 * These mirror the wire-format the backend
 * (`service-image-generation`) sends on
 * `GET /image-generation/v1/generations/:id/segmentation`. Keys come
 * back camelCased because the case-converter middleware re-cases JSONB
 * on response, so every field name in here matches the actual JSON the
 * modal consumes — no extra mapping layer needed.
 */

/**
 * FAL asset envelope around an image URL.
 *
 * FAL responses ship URLs inside `{ url, width, height, contentType }`
 * wrappers, but very early runs persisted plain strings — `assetUrl`
 * in `./category-rows.ts` accepts both forms so older
 * `generation_segmentation` rows keep rendering.
 */
export interface SegmentationFalAsset {
  url: string;
  width?: number;
  height?: number;
  contentType?: string;
}

export interface SegmentationCategoryMetadataEntry {
  box?: number[];
  index?: number;
  score?: number;
}

export interface SegmentationCategoryResponse {
  image?: SegmentationFalAsset | string | null;
  masks?: Array<SegmentationFalAsset | string> | null;
  scores?: number[] | null;
  boxes?: number[][] | null;
  metadata?: SegmentationCategoryMetadataEntry[] | Record<string, unknown> | null;
}

/**
 * Per-step wall-clock breakdown the backend records on every fresh run
 * and persists in `generation_segmentation.timings`. `null` for older
 * rows (predates the column) or for the cached short-circuit path that
 * doesn't re-time anything.
 */
export interface SegmentationTimingStep {
  name: string;
  /** Offset from `startedAt` in ms. */
  startMs: number;
  durationMs: number;
  metadata?: Record<string, unknown> | null;
}

export interface SegmentationTimings {
  totalMs: number;
  startedAt: string;
  endedAt: string;
  steps: SegmentationTimingStep[];
}

/**
 * Reason a per-category metric block is empty. Mirrors
 * `DriftAbsenceReason` in `service-image-generation`'s
 * `drift-assessment.ts` — kept literal so the UI copy can be
 * exhaustive over the enum at compile time.
 */
export type DriftAbsenceReason = 'absent_in_dollhouse' | 'absent_in_sam' | 'absent_in_both';

export interface DriftCategoryHeader {
  category: string;
  dollhousePixelCount: number;
  samPixelCount: number;
  absenceReason?: DriftAbsenceReason;
}

export interface LargeObjectDriftMetrics extends DriftCategoryHeader {
  iou: number | null;
  centroidDriftPx: number | null;
  centroidDriftNormalized: number | null;
  p95SymmetricDistancePx: number | null;
  p95RefToPredPx: number | null;
  p95PredToRefPx: number | null;
  areaRatio: number | null;
}

export interface SurfaceDriftMetrics extends DriftCategoryHeader {
  iou: number | null;
  boundaryDriftPx: number | null;
  boundaryRefToPredPx: number | null;
  boundaryPredToRefPx: number | null;
  pixelClassAccuracy: number | null;
}

export interface SmallObjectDriftMetrics extends DriftCategoryHeader {
  presence: 0 | 1;
  centroidDriftPx: number | null;
  centroidDriftNormalized: number | null;
  p95DistancePx: number | null;
}

export interface OverallDriftMetrics {
  /**
   * Per the user-spec, this is `mismatched_pixels / total_pixels`
   * (NOT the squared-error MSE). The backend keeps the `mse` field
   * name for continuity; the UI displays it as "% mismatched" to make
   * the meaning unambiguous.
   */
  mse: number;
  pixelAccuracy: number;
  numMismatched: number;
  totalPixels: number;
}

/** RGB triple (0–255) sourced from the dollhouse `productMaskMap`. */
export interface DriftRgbColor {
  r: number;
  g: number;
  b: number;
}

/**
 * Persisted drift report comparing SAM masks against the dollhouse
 * product map. Stored on `generation_segmentation.drift_assessment`;
 * keys come back camelCased by the case-converter middleware. The
 * per-category records use the same camelCase SAM category keys as
 * the rest of the response (e.g. `wallTiles`, `showerCurbTiles`).
 */
export interface DriftAssessment {
  version: 1;
  imageWidth: number;
  imageHeight: number;
  overall: OverallDriftMetrics;
  largeObjects: Record<string, LargeObjectDriftMetrics>;
  surfaces: Record<string, SurfaceDriftMetrics>;
  smallObjects: Record<string, SmallObjectDriftMetrics>;
  failedSamMaskUrls?: string[];
  /**
   * Per-SAM-category RGB color the dollhouse renderer painted into the
   * ground-truth `productMaskUrl` PNG for this frame. Used as the
   * primary color source for the modal's swatches so the legend
   * matches the dollhouse product map pixel-for-pixel. Categories not
   * present in this map fall back to the existing palette.
   */
  categoryColors?: Record<string, DriftRgbColor>;
  /**
   * CDN URL of the dollhouse `productMaskUrl` PNG this assessment was
   * computed against. Surfaced so the modal can wipe between the
   * ground-truth mask and the SAM `combinedOverlayUrl` with a
   * comparison slider. Always set on freshly-computed assessments;
   * older rows persisted before this field was added are `undefined`
   * and the slider falls back to the static overlay image.
   */
  productMaskUrl?: string;
}

/**
 * Subset of `DriftOutcome.status` the eval modal might receive on a
 * fresh POST response. The GET endpoint this modal calls doesn't
 * populate the column because it isn't a DB field, but the type
 * stays in sync with the backend contract.
 */
export type DriftStatus =
  | 'computed'
  | 'no_dollhouse_view'
  | 'no_strategy_batch_run'
  | 'no_dollhouse_capture'
  | 'no_product_mask'
  | 'no_sam_results'
  | 'failed';

/**
 * Backend response shape for the GET endpoint above. The backend
 * stores one JSONB column per category on the `generation_segmentation`
 * row, so the response has those categories as top-level keys on
 * `record` alongside row metadata (`id`, `createdAt`,
 * `combinedOverlayUrl`, `timings`). Categories are NOT nested under
 * a `results` field — `buildRows` walks the top-level keys, skipping
 * the metadata fields tracked in `category-rows.ts`.
 */
export interface SegmentationRecord {
  id?: string;
  generationResultId?: string;
  createdAt?: string;
  /**
   * URL of the merged PNG with every category's masks tinted in their
   * configured color and composited over the original output image.
   * `null` means no overlay was produced (older row, no masks, or
   * transient sharp/S3 failure).
   */
  combinedOverlayUrl?: string | null;
  timings?: SegmentationTimings | null;
  /**
   * Drift breakdown vs the dollhouse product map for the same camera
   * frame. `null` (or absent) means drift couldn't be computed — see
   * `driftStatus` for the reason on POST responses, otherwise assume
   * the row predates the column or no dollhouse capture was available.
   */
  driftAssessment?: DriftAssessment | null;
  /** Only present on POST responses; the GET endpoint omits this. */
  driftStatus?: DriftStatus | null;
  // Categories (`vanities`, `faucets`, `toiletFlush`, …) land here, one
  // key per JSONB column on the backend row. TypeScript can't express
  // "every key except metadata" cleanly, so this stays untyped and
  // `buildRows` narrows at the boundary.
  [category: string]: unknown;
}

/**
 * Per-category palette + label lookup. Implemented in
 * `category-lookup.ts` with a three-tier color priority chain
 * (drift-derived → `/segmentation-categories` → baked-in fallback).
 */
export interface CategoryLookup {
  color: (category: string) => string;
  label: (category: string) => string;
}

export interface CategoryMask {
  url: string;
  score: number | null;
}

export interface CategoryRow {
  category: string;
  label: string;
  /** Hex color resolved via `CategoryLookup.color`. */
  color: string;
  /**
   * FAL's `image` field — typically a per-category composite (sometimes
   * just identical to the first entry of `masks`). Used as the headline
   * preview at the top of each card; `masks` is rendered below as a
   * grid so every individual prediction is visible.
   */
  composite: string | null;
  masks: CategoryMask[];
  topScore: number | null;
}

/**
 * Per-SAM-category timing entry SAM fan-out emits in its
 * `metadata.perCategory`. Surfaced as a Gantt bar in the timeline
 * panel so reviewers can spot the slowest categories on a run.
 */
export interface PerCategoryTiming {
  category: string;
  prompt: string;
  durationMs: number;
  ok: boolean;
  error?: string;
}

/**
 * Which drift bucket a row belongs to. Drives which metric columns
 * the unified drift table renders for each row.
 */
export type DriftBucketKind = 'largeObject' | 'surface' | 'smallObject';

export interface DriftRow {
  key: string;
  kind: DriftBucketKind;
  metrics: LargeObjectDriftMetrics | SurfaceDriftMetrics | SmallObjectDriftMetrics;
}
