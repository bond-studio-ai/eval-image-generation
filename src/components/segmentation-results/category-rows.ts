import type {
  CategoryLookup,
  CategoryMask,
  CategoryRow,
  SegmentationCategoryResponse,
  SegmentationFalAsset,
  SegmentationRecord,
} from './types';

/**
 * Top-level keys on the segmentation record that describe the row
 * itself rather than per-category SAM results. Anything outside this
 * set is treated as a category payload by `buildRows`.
 */
const RECORD_METADATA_KEYS = new Set<string>([
  'id',
  'generationResultId',
  'createdAt',
  'combinedOverlayUrl',
  'timings',
  // Drift comparison vs the dollhouse product map. Lives on the row
  // alongside the per-category JSONB columns; the case-converter
  // rewrites the column name to `driftAssessment` on response. Treat
  // it as metadata so the row builder doesn't try to interpret the
  // metric payload as a SAM category result.
  'driftAssessment',
  // Only present on the POST response synthesized from the run
  // outcome. The GET endpoint that this modal calls doesn't populate
  // it because it isn't a DB column, but we include it here so the
  // metadata filter ignores it if a caller hands us a POST payload.
  'driftStatus',
]);

/**
 * Normalize a FAL asset reference into a plain URL string. FAL ships
 * URLs inside `{ url, ... }` wrappers, but very early runs persisted
 * plain strings — accepting both keeps older
 * `generation_segmentation` rows rendering without a migration.
 */
function assetUrl(asset: SegmentationFalAsset | string | null | undefined): string | null {
  if (!asset) return null;
  if (typeof asset === 'string') return asset.length > 0 ? asset : null;
  return typeof asset.url === 'string' && asset.url.length > 0 ? asset.url : null;
}

/**
 * Turn a raw segmentation record into a sorted list of per-category
 * rows ready for rendering. Each entry carries the FAL composite URL,
 * the individual mask URLs with their scores, and the resolved palette
 * color/label for the category.
 *
 * Rows where SAM produced no usable masks (and no composite) are
 * filtered out so the grid isn't cluttered with empty tiles — the
 * legend / per-category status still surfaces via the timeline panel
 * for anyone debugging a zero-mask run.
 */
export function buildRows(
  record: SegmentationRecord | null,
  lookup: CategoryLookup,
): CategoryRow[] {
  if (!record || typeof record !== 'object') return [];

  const entries = Object.entries(record).filter(
    ([key, value]) =>
      !RECORD_METADATA_KEYS.has(key) &&
      value !== null &&
      value !== undefined &&
      typeof value === 'object',
  );

  return entries
    .map(([category, value]) => {
      const data = (value ?? {}) as SegmentationCategoryResponse;
      const rawMasks = Array.isArray(data.masks) ? data.masks : [];
      const scores = Array.isArray(data.scores) ? data.scores : [];
      const masks: CategoryMask[] = rawMasks
        .map((mask, idx): CategoryMask | null => {
          const url = assetUrl(mask);
          if (!url) return null;
          const score = typeof scores[idx] === 'number' ? scores[idx]! : null;
          return { url, score };
        })
        .filter((m): m is CategoryMask => m !== null);

      // Prefer the FAL-provided composite; fall back to the first mask
      // so single-mask categories still get a preview tile.
      const composite = assetUrl(data.image) ?? masks[0]?.url ?? null;

      // FAL only fills the per-prediction `masks` array when
      // `return_multiple_masks=true` is honored. For categories where
      // FAL collapsed everything into the single `image` (or older
      // rows from before that setting), promote the composite into
      // the masks list so the "Individual masks" grid always reflects
      // what was actually predicted.
      if (masks.length === 0 && composite) {
        const fallbackScore = typeof scores[0] === 'number' ? scores[0]! : null;
        masks.push({ url: composite, score: fallbackScore });
      }

      const numericScores = masks
        .map((m) => m.score)
        .filter((s): s is number => typeof s === 'number');

      return {
        category,
        label: lookup.label(category),
        color: lookup.color(category),
        composite,
        masks,
        topScore: numericScores.length > 0 ? Math.max(...numericScores) : null,
      };
    })
    .filter((row) => row.masks.length > 0 || row.composite !== null)
    .sort((a, b) => a.label.localeCompare(b.label));
}
