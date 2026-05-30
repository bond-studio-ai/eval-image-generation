/**
 * Type definitions shared across the review results modal pieces.
 *
 * These mirror the wire-format the backend
 * (`service-image-generation`) sends on
 * `GET /image-generation/v1/generations/:id/review`. Keys come
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
 * Persisted shape for SAM responses keyed by
 * `(conceptGroupId → memberCategoryKey → SamResponse)`. Mirrors the
 * backend's `concept_group_results` JSONB column post the
 * per-category fan-out rollback (PR #82) — SAM now fires one call
 * per present category and persists each member's response under
 * its own category key. Older rows that pre-date the concept-group
 * migration have this field absent; the backend read-side adapter
 * projects legacy per-category columns into this shape so the
 * frontend never sees the legacy form (but the type still tolerates
 * the absent case during the cutover).
 */
export type ConceptGroupResults = Partial<Record<string, Partial<Record<string, SegmentationCategoryResponse>>>>;

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
export type DriftAbsenceReason = "absent_in_dollhouse" | "absent_in_sam" | "absent_in_both";

export interface DriftCategoryHeader {
  category: string;
  dollhousePixelCount: number;
  samPixelCount: number;
  absenceReason?: DriftAbsenceReason;
}

/**
 * Concept-group-aware recall of the dollhouse mask, per category.
 * Mirrors `ProductMaskCoverage` in the service. The backend now
 * uses this as the authoritative "did SAM identify this surface?"
 * signal — `recall = matched / dollhousePixels` is what reviewers
 * should look at when judging whether the model correctly placed
 * the product. `null` overall when the dollhouse has no pixels for
 * this category.
 */
export interface ProductMaskCoverage {
  matchedPixels: number;
  dollhousePixels: number;
  recall: number | null;
}

export interface LargeObjectDriftMetrics extends DriftCategoryHeader {
  iou: number | null;
  centroidDriftPx: number | null;
  centroidDriftNormalized: number | null;
  p95SymmetricDistancePx: number | null;
  p95RefToPredPx: number | null;
  p95PredToRefPx: number | null;
  areaRatio: number | null;
  productMaskCoverage: ProductMaskCoverage | null;
}

export interface SurfaceDriftMetrics extends DriftCategoryHeader {
  iou: number | null;
  boundaryDriftPx: number | null;
  boundaryRefToPredPx: number | null;
  boundaryPredToRefPx: number | null;
  pixelClassAccuracy: number | null;
  productMaskCoverage: ProductMaskCoverage | null;
}

export interface SmallObjectDriftMetrics extends DriftCategoryHeader {
  presence: 0 | 1;
  centroidDriftPx: number | null;
  centroidDriftNormalized: number | null;
  p95DistancePx: number | null;
  productMaskCoverage: ProductMaskCoverage | null;
}

export interface OverallDriftMetrics {
  /**
   * Concept-group-aware mismatch rate restricted to dollhouse-labeled
   * pixels: `num_mismatched / total_pixels` where both counts cover
   * only pixels the `productMaskUrl` actually labeled, and a pixel
   * counts as "matched" when **any member** of its dollhouse
   * category's concept group covered it in SAM. The backend keeps
   * the field name `mse` for backwards compatibility; the UI labels
   * the value "% mismatched" to make the meaning unambiguous. `0`
   * means every dollhouse-labeled pixel was recognized by some
   * group member.
   */
  mse: number;
  pixelAccuracy: number;
  /** Dollhouse-labeled pixels not covered by their concept group's
   *  SAM union. */
  numMismatched: number;
  /** Total dollhouse-labeled pixels (background excluded). */
  totalPixels: number;
}

/**
 * Persisted drift report comparing SAM masks against the dollhouse
 * product map. Stored on
 * `generation_review.review_assessment.plugins.segmentationDrift`;
 * keys come back camelCased by the case-converter middleware. The
 * per-category records use the same camelCase SAM category keys as
 * the rest of the response (e.g. `wallTiles`, `showerCurbTiles`).
 *
 * Swatch colors come from `/segmentation-categories` (cached per
 * session). The drift assessment no longer carries per-category RGBs;
 * the codebase palette is the single source of truth.
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
 * Affine fit recovered by the depth plugin's least-squares solver.
 * `null` when the fit was ill-conditioned (uniform predicted values,
 * too few valid pixels, etc.). When `null`, the `metrics` triplet is
 * also nulled — only the alignment-free `spearman` survives.
 */
export interface DepthAffineFit {
  scale: number;
  shift: number;
}

/**
 * Per-pixel monocular depth metrics computed after applying the
 * affine fit. Mirrors the `DepthAssessment.metrics` block on the
 * service. All values are `null` when the affine fit failed; the
 * alignment-free `spearman` rank correlation can still be set even
 * when the others are `null`.
 */
export interface DepthMetricsBlock {
  absRel: number | null;
  rmse: number | null;
  delta1: number | null;
  spearman: number | null;
}

/**
 * Persisted depth-drift plugin payload. Lives at
 * `reviewAssessment.plugins.depthDrift` on the wire and mirrors
 * the service-side `DepthAssessment` interface. Image dimensions
 * are the dollhouse EXR's, not the AI output's — the depth plugin
 * compares everything in the dollhouse depth grid.
 */
export interface DepthAssessment {
  predictedDepthUrl: string;
  dollhouseDepthUrl: string;
  width: number;
  height: number;
  validPixels: number;
  alignment: DepthAffineFit | null;
  metrics: DepthMetricsBlock | null;
  /**
   * `'too_few_valid_pixels'` when the dollhouse + predicted intersection
   * was below `MIN_VALID_PIXELS_FOR_ALIGNMENT`, so neither the affine
   * fit nor the metric triplet was attempted. Absent on the happy
   * path.
   */
  absenceReason?: "too_few_valid_pixels";
}

/**
 * Subset of `DriftOutcome.status` the eval modal might receive on a
 * fresh POST response. The GET endpoint this modal calls doesn't
 * populate the column because it isn't a DB field, but the type
 * stays in sync with the backend contract.
 */
export type DriftStatus = "computed" | "no_dollhouse_view" | "no_strategy_batch_run" | "no_dollhouse_capture" | "no_product_mask" | "no_sam_results" | "failed";

/**
 * Per-plugin lifecycle status keyed by plugin id. Mirrors the service's
 * `ReviewPluginStatuses` — `segmentationDrift`, `depthDrift`, plus any
 * future plugins. Only present on POST responses; the GET endpoint
 * omits this field because the per-plugin status isn't persisted on
 * the JSONB envelope (only the assessment payload is).
 */
export type PluginStatuses = Record<string, string>;

/**
 * Plugin-keyed envelope for the persisted review assessment. Each
 * registered plugin owns one entry under `plugins[plugin.id]`; the
 * modal renders one card per known plugin id (see
 * `plugin-renderers/index.tsx`) and skips ids it doesn't have a
 * renderer for. `version` is bumped only on a breaking shape change
 * to one of the plugin payloads.
 */
export interface ReviewAssessment {
  version: 1;
  plugins: {
    segmentationDrift?: DriftAssessment;
    depthDrift?: DepthAssessment;
    [pluginId: string]: unknown;
  };
}

/**
 * Backend response shape for the GET endpoint above. The backend
 * stores one JSONB column per category on the `generation_review`
 * row, so the response has those categories as top-level keys on
 * `record` alongside row metadata (`id`, `createdAt`,
 * `combinedOverlayUrl`, `timings`). Categories are NOT nested under
 * a `results` field — `buildRows` walks the top-level keys, skipping
 * the metadata fields tracked in `category-rows.ts`.
 */
export interface ReviewRecord {
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
   * Plugin-keyed review envelope. `null` (or absent) means no
   * registered plugin produced an assessment (e.g. one-shot run
   * with no dollhouse view). The modal iterates the plugin
   * registry and renders one section per known plugin id.
   */
  reviewAssessment?: ReviewAssessment | null;
  /** Only present on POST responses; the GET endpoint omits this. */
  pluginStatuses?: PluginStatuses | null;
  /**
   * Canonical SAM payload, keyed by
   * `(conceptGroupId → memberCategoryKey → SamResponse)`. New rows
   * always carry this field; legacy rows get it back-filled by the
   * backend read-side adapter from the per-category JSONB columns.
   * The eval modal renders one card per member category so every
   * present category gets its own preview — even two categories
   * that share a SAM prompt (e.g. paints + wallpapers both fired
   * `Wall`) show up as separate cards.
   */
  conceptGroupResults?: ConceptGroupResults | null;
  // Legacy per-category JSONB columns may still appear on rows that
  // pre-date `concept_group_results`. `buildRows` falls back to them
  // when the new field is missing.
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
  /**
   * Same as `label` today; retained for legacy callsites that
   * differentiated between the legend label and a `— Prompt`
   * suffix on the card. Per-category fan-out makes the prompt
   * distinct from the label, so the legend can always read
   * `label` directly.
   */
  baseLabel?: string;
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
  /** Concept-group id this card belongs to. Present on rows derived
   *  from `conceptGroupResults`. */
  group?: string;
  /** Member category key on the wire (camelCase or snake_case
   *  depending on whether the API case converter touched the JSONB
   *  payload). Used to drive deterministic card keys. */
  promptSlug?: string;
  /**
   * Exact SAM prompt string the orchestrator sent to FAL for this
   * card's category, e.g. `Wall` for `paints`, `Wainscoting` for
   * `wall_tiles`. Surfaced in the card subtitle so reviewers can
   * tell at a glance what noun phrase produced the mask.
   */
  promptLabel?: string;
  /** Sibling member labels the drift comparator considers alongside
   *  this card's category (per the group's MemberRule). Multi-member
   *  groups surface the union of their members here so the card
   *  tooltip can read "drift considers: Paint, Wallpaper, …". */
  consumerLabels?: string[];
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
export type DriftBucketKind = "largeObject" | "surface" | "smallObject";

export interface DriftRow {
  key: string;
  kind: DriftBucketKind;
  metrics: LargeObjectDriftMetrics | SurfaceDriftMetrics | SmallObjectDriftMetrics;
}
