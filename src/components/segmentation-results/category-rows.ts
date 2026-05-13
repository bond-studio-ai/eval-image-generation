import type { SegmentationCategoryMetadata } from '@/lib/segmentation-categories';
import type {
  CategoryLookup,
  CategoryMask,
  CategoryRow,
  ConceptGroupResults,
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
  // Canonical group-keyed payload; `buildRows` reads it directly and
  // ignores its presence at the top-level scan below.
  'conceptGroupResults',
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

function snakeToCamel(value: string): string {
  return value.replace(/_([a-z0-9])/g, (_, character: string) => character.toUpperCase());
}

/**
 * Build a `(category | groupId) → metadata` lookup so the row builder
 * can resolve label / color / consumer-member lists for both the
 * canonical snake_case keys and the camelCase form the case-converter
 * middleware emits over JSON.
 *
 * `consumersByGroupPrompt` is keyed by `${camelGroup}/${camelSlug}`
 * because the API case converter recursively rewrites JSONB keys on
 * the wire — `conceptGroupResults` arrives with camelCase group ids
 * (`showerGlass`) and camelCase prompt slugs (`toiletFlusher`) even
 * though the backend persists them snake_case. Storing both forms
 * keeps the row builder agnostic to whichever casing it has on hand,
 * but the camel form is the one `Object.entries(conceptGroupResults)`
 * iterates so we register it explicitly.
 */
function indexMetadata(entries: SegmentationCategoryMetadata[] | null) {
  const byKey = new Map<string, SegmentationCategoryMetadata>();
  const consumersByGroupPrompt = new Map<string, SegmentationCategoryMetadata[]>();
  const byGroupKey = new Map<string, SegmentationCategoryMetadata>();
  if (!entries) return { byKey, consumersByGroupPrompt, byGroupKey };
  for (const entry of entries) {
    byKey.set(entry.key, entry);
    const camelKey = snakeToCamel(entry.key);
    if (camelKey !== entry.key) byKey.set(camelKey, entry);
    if (!byGroupKey.has(entry.group)) byGroupKey.set(entry.group, entry);
    const camelGroup = snakeToCamel(entry.group);
    if (camelGroup !== entry.group && !byGroupKey.has(camelGroup))
      byGroupKey.set(camelGroup, entry);
    for (const slug of entry.resolvedPromptSlugs) {
      const snakeRef = `${entry.group}/${slug}`;
      const camelRef = `${camelGroup}/${snakeToCamel(slug)}`;
      const refs = camelRef === snakeRef ? [snakeRef] : [snakeRef, camelRef];
      for (const key of refs) {
        const consumers = consumersByGroupPrompt.get(key) ?? [];
        if (!consumers.includes(entry)) consumers.push(entry);
        consumersByGroupPrompt.set(key, consumers);
      }
    }
  }
  return { byKey, consumersByGroupPrompt, byGroupKey };
}

function readResponse(value: unknown): {
  composite: string | null;
  masks: CategoryMask[];
  topScore: number | null;
} {
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

  const composite = assetUrl(data.image) ?? masks[0]?.url ?? null;
  if (masks.length === 0 && composite) {
    const fallbackScore = typeof scores[0] === 'number' ? scores[0]! : null;
    masks.push({ url: composite, score: fallbackScore });
  }

  const numericScores = masks.map((m) => m.score).filter((s): s is number => typeof s === 'number');
  return {
    composite,
    masks,
    topScore: numericScores.length > 0 ? Math.max(...numericScores) : null,
  };
}

/**
 * Turn a raw segmentation record into a sorted list of preview cards.
 *
 * Two code paths:
 *
 * 1. New rows carry `conceptGroupResults`. Each `(groupId, promptSlug)`
 *    pair becomes its own card — multi-prompt groups (e.g. Wall +
 *    Wainscoting) yield two cards keyed by the group prompt so the
 *    reviewer can compare them side-by-side. Cards inherit the
 *    representative member's color/label for the row title.
 * 2. Legacy rows (pre-concept-groups) only have per-category JSONB
 *    columns. The row builder falls back to the older flow that
 *    treats every top-level non-metadata key as a category payload.
 *
 * Rows where SAM produced no usable masks (and no composite) are
 * filtered out so the grid isn't cluttered with empty tiles — the
 * legend / per-category status still surfaces via the timeline panel
 * for anyone debugging a zero-mask run.
 */
export function buildRows(
  record: SegmentationRecord | null,
  lookup: CategoryLookup,
  metadata: SegmentationCategoryMetadata[] | null = null,
): CategoryRow[] {
  if (!record || typeof record !== 'object') return [];

  const conceptGroupResults =
    record.conceptGroupResults && typeof record.conceptGroupResults === 'object'
      ? (record.conceptGroupResults as ConceptGroupResults)
      : null;

  const rows: CategoryRow[] = [];
  if (conceptGroupResults) {
    const { byKey, consumersByGroupPrompt, byGroupKey } = indexMetadata(metadata);
    for (const [groupId, bucket] of Object.entries(conceptGroupResults)) {
      if (!bucket) continue;
      for (const [promptSlug, response] of Object.entries(bucket)) {
        if (!response || typeof response !== 'object') continue;
        const { composite, masks, topScore } = readResponse(response);
        if (masks.length === 0 && composite === null) continue;
        // The API case converter rewrites JSONB keys to camelCase on
        // the wire, so iterating `conceptGroupResults` yields ids
        // like `showerGlass` / `toiletFlusher` even though the
        // backend persists them snake_case. `indexMetadata` registers
        // both forms in `consumersByGroupPrompt` so this lookup hits
        // for groups and slugs that contain underscores.
        const representativeKey = `${groupId}/${promptSlug}`;
        const consumers = consumersByGroupPrompt.get(representativeKey) ?? [];
        const fallbackMember =
          consumers[0] ?? byKey.get(groupId) ?? byGroupKey.get(groupId) ?? null;
        const categoryKey = fallbackMember?.key ?? groupId;
        const groupPrompt = fallbackMember?.groupPrompts.find(
          (p) => p.slug === promptSlug || snakeToCamel(p.slug) === promptSlug,
        );
        const baseLabel = fallbackMember ? lookup.label(fallbackMember.key) : lookup.label(groupId);
        const promptSuffix =
          groupPrompt?.prompt ??
          promptSlug
            .replace(/([a-z])([A-Z])/g, '$1 $2')
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase());
        const label = `${baseLabel} — ${promptSuffix}`;
        const consumerLabels = consumers
          .map((entry) => lookup.label(entry.key))
          .filter((value, idx, all) => all.indexOf(value) === idx);
        rows.push({
          category: categoryKey,
          label,
          baseLabel,
          color: lookup.color(categoryKey),
          composite,
          masks,
          topScore,
          group: groupId,
          promptSlug,
          promptLabel: promptSuffix,
          consumerLabels,
        });
      }
    }
    rows.sort((a, b) => a.label.localeCompare(b.label));
    return rows;
  }

  const entries = Object.entries(record).filter(
    ([key, value]) =>
      !RECORD_METADATA_KEYS.has(key) &&
      value !== null &&
      value !== undefined &&
      typeof value === 'object',
  );

  return entries
    .map(([category, value]) => {
      const { composite, masks, topScore } = readResponse(value);
      return {
        category,
        label: lookup.label(category),
        color: lookup.color(category),
        composite,
        masks,
        topScore,
      };
    })
    .filter((row) => row.masks.length > 0 || row.composite !== null)
    .sort((a, b) => a.label.localeCompare(b.label));
}
