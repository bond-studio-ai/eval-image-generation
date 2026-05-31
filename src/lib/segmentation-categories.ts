import { serviceUrl } from "./api-base";

/**
 * Canonical metadata for one SAM 3.1 segmentation category as returned by
 * `GET /image-generation/v1/segmentation-categories`. The backend
 * (`src/application/segmentation.ts → listSegmentationCategories`) is the
 * single source of truth for legend colors + labels + prompts; the
 * frontend fetches this on demand so its legend can't drift the way the
 * previously-duplicated `SEGMENTATION_COLORS` table did.
 */
export interface SegmentationCategoryMetadata {
  /** Canonical snake_case key, e.g. `wall_tiles`. */
  key: string;
  /** Human-readable legend label, e.g. `Toilet flush`. */
  label: string;
  /** Hex (`#RRGGBB`) the overlay paints this category in. */
  color: string;
  /**
   * Exact SAM 3.1 prompt string the orchestrator fires for this
   * category (one SAM call per category). Surfaced on each card in
   * the eval modal so reviewers can see what noun phrase produced
   * the mask — two categories may share a prompt string (e.g.
   * paints + wallpapers both fire `Wall`) but still each get their
   * own card and their own persisted response.
   */
  samPrompt: string;
  /** True for scene-shell extras (`ceilings`, `doors`, `windows`). */
  isExtra: boolean;
  /**
   * Concept-group identifier this category belongs to. Singleton
   * categories use their own name as the group id. Multi-member
   * groups (`wall`, `floor`, `shower_glass`, `toilets`) bundle
   * categories whose drift comparison considers sibling masks
   * during resolution.
   */
  group: string;
  /**
   * Every member of this category's group, with each member's
   * per-category SAM prompt. `slug` is the member category key;
   * `prompt` is the exact string sent to SAM for that member. The
   * eval modal can use this to render a per-member legend hint
   * without a second round-trip.
   */
  groupPrompts: readonly { slug: string; prompt: string }[];
  /**
   * Member categories whose own SAM masks this category considers
   * during drift comparison. Order is meaningful for
   * `firstNonEmpty` rules — the first member with masks wins. For
   * singletons it's just `[key]`.
   */
  resolvedPromptSlugs: readonly string[];
  /** `'union'` or `'firstNonEmpty'` — drives the tooltip phrasing. */
  resolutionKind: "union" | "firstNonEmpty";
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
  return value.replaceAll(/_([a-z0-9])/g, (_, character: string) => character.toUpperCase());
}

async function fetchOnce(): Promise<SegmentationCategoryMetadata[]> {
  const res = await fetch(serviceUrl("segmentation-categories"), {
    cache: "no-store"
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch segmentation categories: ${res.status} ${res.statusText}`);
  }
  const json = (await res.json()) as { data?: SegmentationCategoryMetadata[] | null } | null;
  const data = json?.data;
  if (!Array.isArray(data)) {
    throw new TypeError("Malformed segmentation categories response");
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
async function loadSegmentationCategories(): Promise<SegmentationCategoryMetadata[]> {
  try {
    return await fetchOnce();
  } catch (error) {
    // Clear the cache so the next call retries instead of replaying the rejection.
    cache = null;
    throw error;
  }
}

export function getSegmentationCategories(): Promise<SegmentationCategoryMetadata[]> {
  cache ??= loadSegmentationCategories();
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
export function indexByKey(entries: SegmentationCategoryMetadata[]): Map<string, SegmentationCategoryMetadata> {
  const map = new Map<string, SegmentationCategoryMetadata>();
  for (const entry of entries) {
    map.set(entry.key, entry);
    const camel = snakeToCamel(entry.key);
    if (camel !== entry.key) map.set(camel, entry);
  }
  return map;
}
