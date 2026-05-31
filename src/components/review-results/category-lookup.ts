import { useEffect, useState } from "react";
import { getSegmentationCategories, indexByKey, type SegmentationCategoryMetadata } from "@/lib/segmentation-categories";
import type { CategoryLookup } from "./types";

/**
 * Fallback hex palette used when the `/segmentation-categories` endpoint
 * hasn't responded yet (or has failed). The authoritative palette comes
 * from the backend — see `DEFAULT_SEGMENTATION_COLORS` in
 * `service-image-generation/src/domain/segmentation/overlay-colors.ts`.
 *
 * Keys are registered in BOTH snake_case and camelCase because the
 * segmentation endpoint uses camelCase keys (the case-converter
 * middleware rewrites all JSON object keys on the way out), which is
 * what tripped the legend before this fallback existed — multi-word
 * categories silently fell through to the neutral gray.
 */
const FALLBACK_COLORS: Record<string, string> = {
  vanities: "#E6194B",
  faucets: "#3CB44B",
  lightings: "#FFE119",
  mirrors: "#4363D8",
  shower_systems: "#F58231",
  showerSystems: "#F58231",
  floor_tiles: "#911EB4",
  floorTiles: "#911EB4",
  lvps: "#911EB4",
  wall_tiles: "#46F0F0",
  wallTiles: "#46F0F0",
  tubs: "#F032E6",
  tub_fillers: "#BCF60C",
  tubFillers: "#BCF60C",
  tub_doors: "#FABEBE",
  tubDoors: "#FABEBE",
  shower_glasses: "#FABEBE",
  showerGlasses: "#FABEBE",
  shower_wall_tiles: "#008080",
  showerWallTiles: "#008080",
  shower_floor_tiles: "#E6BEFF",
  showerFloorTiles: "#E6BEFF",
  shower_curb_tiles: "#9A6324",
  showerCurbTiles: "#9A6324",
  toilets: "#FFFAC8",
  paints: "#46F0F0",
  wallpapers: "#800000",
  shelves: "#AAFFC3",
  toilet_paper_holders: "#808000",
  toiletPaperHolders: "#808000",
  towel_bars: "#FFD8B1",
  towelBars: "#FFD8B1",
  robe_hooks: "#000075",
  robeHooks: "#000075",
  towel_rings: "#A9A9A9",
  towelRings: "#A9A9A9",
  ceilings: "#C0C0C0",
  doors: "#5C3317",
  windows: "#1E90FF"
};

const NEUTRAL_SWATCH = "#9CA3AF";

function fallbackLabel(category: string): string {
  return category.replaceAll("_", " ").replaceAll(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Resolve a `(category) -> { color, label }` lookup. Color resolution
 * is a two-tier priority chain:
 *
 * 1. The backend `/segmentation-categories` palette (cached per
 *    session via `useSegmentationCategories`). This is the
 *    source-of-truth so the modal swatches always match what the
 *    backend painted into the combined overlay PNG.
 * 2. The baked-in `FALLBACK_COLORS` table, used while the categories
 *    fetch is in flight or after it has failed.
 *
 * Anything that falls through both tiers renders as the neutral swatch.
 */
export function buildCategoryLookup(entries: SegmentationCategoryMetadata[] | null): CategoryLookup {
  const indexed = entries ? indexByKey(entries) : null;
  return {
    color: (category) => indexed?.get(category)?.color ?? FALLBACK_COLORS[category] ?? NEUTRAL_SWATCH,
    label: (category) => indexed?.get(category)?.label ?? fallbackLabel(category)
  };
}

/**
 * React hook wrapping the module-level cached fetch in
 * `getSegmentationCategories`. Returns `null` until the response lands
 * (caller falls back to the baked-in palette in the meantime). Errors
 * are intentionally swallowed — the fallback palette covers them and
 * a transient backend outage shouldn't break the modal.
 */
export function useSegmentationCategories(): SegmentationCategoryMetadata[] | null {
  const [entries, setEntries] = useState<SegmentationCategoryMetadata[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await getSegmentationCategories();
        if (!cancelled) setEntries(data);
      } catch {
        /* swallowed: fallback palette is in place */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return entries;
}
