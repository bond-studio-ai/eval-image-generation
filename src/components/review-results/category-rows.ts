import type { SegmentationCategoryMetadata } from "@/lib/segmentation-categories";
import type { CategoryLookup, CategoryMask, CategoryRow, ReviewRecord, SegmentationCategoryResponse, SegmentationFalAsset } from "./types";

/**
 * Top-level keys on the review record that describe the row itself
 * rather than per-category SAM results. Anything outside this set is
 * treated as a category payload by `buildRows`.
 */
const RECORD_METADATA_KEYS = new Set<string>([
  "combinedOverlayUrl",
  // Canonical group-keyed payload; `buildRows` reads it directly and
  // ignores its presence at the top-level scan below.
  "conceptGroupResults",
  "createdAt",
  "generationResultId",
  "id",
  // Only present on the POST response synthesized from the run
  // outcome. The GET endpoint that this modal calls doesn't populate
  // it because it isn't a DB column, but we include it here so the
  // metadata filter ignores it if a caller hands us a POST payload.
  "pluginStatuses",
  // Plugin-keyed review envelope (`segmentationDrift`, `depthDrift`,
  // future plugins). Lives on the row alongside the per-category
  // JSONB columns; the case-converter rewrites the column name to
  // `reviewAssessment` on response. Treat it as metadata so the row
  // builder doesn't try to interpret the plugin payload as a SAM
  // category result.
  "reviewAssessment",
  "timings"
]);

/**
 * Normalize a FAL asset reference into a plain URL string. FAL ships
 * URLs inside `{ url, ... }` wrappers, but very early runs persisted
 * plain strings — accepting both keeps older
 * `generation_segmentation` rows rendering without a migration.
 */
function assetUrl(asset: SegmentationFalAsset | string | null | undefined): string | null {
  if (!asset) return null;
  if (typeof asset === "string") return asset.length > 0 ? asset : null;
  return typeof asset.url === "string" && asset.url.length > 0 ? asset.url : null;
}

function snakeToCamel(value: string): string {
  return value.replaceAll(/_([a-z0-9])/g, (_, character: string) => character.toUpperCase());
}

/**
 * Build lookups so the row builder can resolve label / color / sibling
 * members for both the canonical snake_case keys and the camelCase
 * form the case-converter middleware emits over JSON.
 *
 * - `byKey`: maps either snake_case or camelCase category names to
 *   the metadata entry.
 * - `byGroupId`: maps either snake_case or camelCase group ids to
 *   every member of that group, so the row builder can fill out
 *   `consumerLabels` without re-traversing `entries`.
 *
 * `conceptGroupResults` arrives camelCased on the wire (the API case
 * converter recursively rewrites JSONB keys), so both lookups
 * register both casings to stay agnostic.
 */
function indexMetadata(entries: SegmentationCategoryMetadata[] | null) {
  const byKey = new Map<string, SegmentationCategoryMetadata>();
  const byGroupId = new Map<string, SegmentationCategoryMetadata[]>();
  if (!entries) return { byKey, byGroupId };
  for (const entry of entries) {
    byKey.set(entry.key, entry);
    const camelKey = snakeToCamel(entry.key);
    if (camelKey !== entry.key) byKey.set(camelKey, entry);

    // Each entry is visited once, so a group's member list never sees the
    // same entry twice — push directly without a dedup check.
    const groupKeys = new Set([entry.group, snakeToCamel(entry.group)]);
    for (const groupKey of groupKeys) {
      const members = byGroupId.get(groupKey);
      if (members) members.push(entry);
      else byGroupId.set(groupKey, [entry]);
    }
  }
  return { byKey, byGroupId };
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
      const score = typeof scores[idx] === "number" ? scores[idx] : null;
      return { url, score };
    })
    .filter((mask): mask is CategoryMask => mask !== null);

  const composite = assetUrl(data.image) ?? masks[0]?.url ?? null;
  if (masks.length === 0 && composite) {
    const fallbackScore = typeof scores[0] === "number" ? scores[0] : null;
    masks.push({ url: composite, score: fallbackScore });
  }

  const numericScores = masks.map((mask) => mask.score).filter((score): score is number => typeof score === "number");
  return {
    composite,
    masks,
    topScore: numericScores.length > 0 ? Math.max(...numericScores) : null
  };
}

/**
 * Turn a raw segmentation record into a sorted list of preview cards.
 *
 * Two code paths:
 *
 * 1. New rows carry `conceptGroupResults` keyed by
 *    `(groupId → memberCategoryKey)`. Each member becomes its own
 *    card — two categories that share a SAM prompt (e.g. paints and
 *    wallpapers both firing `Wall`) still each yield a card because
 *    SAM is called once per category. The card subtitle surfaces
 *    the exact SAM prompt string fired for that category.
 * 2. Legacy rows (pre-concept-groups) only have per-category JSONB
 *    columns. The row builder falls back to the older flow that
 *    treats every top-level non-metadata key as a category payload.
 *
 * Empty-mask categories are KEPT — they render as a card with a
 * "No masks returned" placeholder. The orchestrator persists the
 * SAM response even when `masks` is empty (see `runForGeneration`
 * in `segmentation.ts`), so the frontend treats every present
 * `(group, category)` bucket as proof that SAM was actually
 * invoked for it. Surfacing zero-mask cards lets reviewers tell
 * "SAM ran and found nothing" apart from "SAM was never asked"
 * — useful when debugging scene-shell extras (`doors`, `windows`,
 * `ceilings`) that often miss in tight bathroom frames.
 */
export function buildRows(record: ReviewRecord | null, lookup: CategoryLookup, metadata: SegmentationCategoryMetadata[] | null = null): CategoryRow[] {
  if (!record || typeof record !== "object") return [];

  const conceptGroupResults = record.conceptGroupResults && typeof record.conceptGroupResults === "object" ? record.conceptGroupResults : null;

  const rows: CategoryRow[] = [];
  if (conceptGroupResults) {
    const { byKey, byGroupId } = indexMetadata(metadata);
    for (const [groupId, bucket] of Object.entries(conceptGroupResults)) {
      if (!bucket) continue;
      const groupMembers = byGroupId.get(groupId) ?? [];
      for (const [memberKey, response] of Object.entries(bucket)) {
        if (!response || typeof response !== "object") continue;
        const { composite, masks, topScore } = readResponse(response);
        // Empty-mask buckets are kept — `CategoryCard` renders a
        // "No masks returned" placeholder so reviewers can confirm
        // SAM was actually invoked for the category. The presence
        // of the bucket itself is the signal: the backend only
        // writes a `(group, category)` entry when SAM returned an
        // `ok: true` response (even if its `masks` array is empty).
        // The API case converter rewrites JSONB keys to camelCase on
        // the wire so iterating yields `showerGlass` / `wallTiles`
        // even though the backend persists them snake_case. The
        // metadata lookup is indexed under both forms.
        const member = byKey.get(memberKey) ?? null;
        const categoryKey = member?.key ?? memberKey;
        const baseLabel = member ? lookup.label(member.key) : lookup.label(memberKey);
        const promptLabel =
          member?.samPrompt ??
          memberKey
            .replaceAll(/(?<=[a-z])(?=[A-Z])/g, " ")
            .replaceAll("_", " ")
            .replaceAll(/\b\w/g, (char) => char.toUpperCase());
        const seenLabels = new Set<string>();
        const consumerLabels: string[] = [];
        for (const entry of groupMembers) {
          const value = lookup.label(entry.key);
          if (!seenLabels.has(value)) {
            seenLabels.add(value);
            consumerLabels.push(value);
          }
        }
        rows.push({
          category: categoryKey,
          label: baseLabel,
          baseLabel,
          color: lookup.color(categoryKey),
          composite,
          masks,
          topScore,
          group: groupId,
          promptSlug: memberKey,
          promptLabel,
          consumerLabels
        });
      }
    }
    rows.sort((a, b) => a.label.localeCompare(b.label));
    return rows;
  }

  const entries = Object.entries(record).filter(([key, value]) => !RECORD_METADATA_KEYS.has(key) && value !== null && value !== undefined && typeof value === "object");

  return entries
    .map(([category, value]) => {
      const { composite, masks, topScore } = readResponse(value);
      return {
        category,
        label: lookup.label(category),
        color: lookup.color(category),
        composite,
        masks,
        topScore
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label));
}
