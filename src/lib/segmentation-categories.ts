import { serviceUrl } from './api-base';

/**
 * Canonical metadata for one SAM 3.1 segmentation category as returned by
 * `GET /image-generation/v1/segmentation-categories`. The backend
 * (`src/application/segmentation.ts → listSegmentationCategories`) is the
 * single source of truth for legend colors + labels + prompts; the
 * frontend fetches this on demand so its legend can't drift the way the
 * previously-duplicated `SEGMENTATION_COLORS` table did.
 */
export interface SegmentationCategoryMetadata {
  /** Canonical snake_case key, e.g. `toilet_flush`. */
  key: string;
  /** Human-readable legend label, e.g. `Toilet flush`. */
  label: string;
  /** Hex (`#RRGGBB`) the overlay paints this category in. */
  color: string;
  /** Primary SAM prompt (fallback / single prompt). */
  samPrompt: string;
  /** True for scene-shell extras (currently only `ceilings`). */
  isExtra: boolean;
  /**
   * Concept-group identifier this category belongs to. Singleton
   * categories use their own name as the group id. Multi-member
   * groups (`wall`, `floor`, `shower_glass`, `toilets`) share one
   * group across multiple member categories so SAM calls are
   * deduplicated and the drift row tooltip can phrase the resolution
   * rule correctly.
   */
  group: string;
  /**
   * Every SAM prompt fired for this category's group. The eval modal
   * displays one card per `(group, prompt)` pair plus a sub-label
   * listing which member categories consume that prompt.
   */
  groupPrompts: ReadonlyArray<{ slug: string; prompt: string }>;
  /**
   * Stable prompt slugs (from `groupPrompts`) the category actually
   * resolves to during drift. Order is meaningful for `firstNonEmpty`
   * rules — the first prompt with masks wins.
   */
  resolvedPromptSlugs: readonly string[];
  /** `'union'` or `'firstNonEmpty'` — drives the tooltip phrasing. */
  resolutionKind: 'union' | 'firstNonEmpty';
}

let cache: Promise<SegmentationCategoryMetadata[]> | null = null;

/**
 * Convert a snake_case key (the backend's canonical form) to the
 * camelCase form the case-converter middleware produces on JSON responses.
 * Used to build a lookup map that works regardless of which casing the
 * caller has on hand — `record.results` from the segmentation endpoint
 * uses camelCase keys, but the SAM prompt table on the backend is keyed
 * snake_case, so we register both.
 */
function snakeToCamel(value: string): string {
  return value.replace(/_([a-z0-9])/g, (_, character: string) => character.toUpperCase());
}

async function fetchOnce(): Promise<SegmentationCategoryMetadata[]> {
  const res = await fetch(serviceUrl('segmentation-categories'), {
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch segmentation categories: ${res.status} ${res.statusText}`);
  }
  const json = (await res.json()) as { data?: SegmentationCategoryMetadata[] | null } | null;
  const data = json?.data;
  if (!Array.isArray(data)) {
    throw new Error('Malformed segmentation categories response');
  }
  return data;
}

/**
 * Module-level cached fetch. The category palette never changes within a
 * session, so resolving the promise once is plenty — every modal open
 * across every batch run hits the same promise.
 *
 * On failure the cache is cleared so the next call retries (e.g. if the
 * service was temporarily down during the first open).
 */
export function getSegmentationCategories(): Promise<SegmentationCategoryMetadata[]> {
  cache ??= fetchOnce().catch((err: unknown) => {
    cache = null;
    throw err;
  });
  return cache;
}

/**
 * Returns a `(camelOrSnakeKey) -> metadata` map so callers can look up
 * a category by whichever casing they happen to hold. The segmentation
 * results endpoint returns categories under camelCase keys (the
 * case-converter middleware rewrites object keys on the way out), but
 * the backend's prompt table — and most internal code — is keyed
 * snake_case. Registering both keeps callers from having to care.
 */
export function indexByKey(
  entries: SegmentationCategoryMetadata[],
): Map<string, SegmentationCategoryMetadata> {
  const map = new Map<string, SegmentationCategoryMetadata>();
  for (const entry of entries) {
    map.set(entry.key, entry);
    const camel = snakeToCamel(entry.key);
    if (camel !== entry.key) map.set(camel, entry);
  }
  return map;
}
