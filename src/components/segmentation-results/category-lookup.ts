import {
  getSegmentationCategories,
  indexByKey,
  type SegmentationCategoryMetadata,
} from '@/lib/segmentation-categories';
import { useEffect, useState } from 'react';
import type { CategoryLookup, DriftAssessment } from './types';

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
  vanities: '#E6194B',
  faucets: '#3CB44B',
  lightings: '#FFE119',
  mirrors: '#4363D8',
  shower_systems: '#F58231',
  showerSystems: '#F58231',
  floor_tiles: '#911EB4',
  floorTiles: '#911EB4',
  lvps: '#911EB4',
  wall_tiles: '#46F0F0',
  wallTiles: '#46F0F0',
  tubs: '#F032E6',
  tub_fillers: '#BCF60C',
  tubFillers: '#BCF60C',
  tub_doors: '#FABEBE',
  tubDoors: '#FABEBE',
  shower_glasses: '#FABEBE',
  showerGlasses: '#FABEBE',
  shower_wall_tiles: '#008080',
  showerWallTiles: '#008080',
  shower_floor_tiles: '#E6BEFF',
  showerFloorTiles: '#E6BEFF',
  shower_curb_tiles: '#9A6324',
  showerCurbTiles: '#9A6324',
  toilets: '#FFFAC8',
  paints: '#46F0F0',
  wallpapers: '#800000',
  shelves: '#AAFFC3',
  toilet_paper_holders: '#808000',
  toiletPaperHolders: '#808000',
  towel_bars: '#FFD8B1',
  towelBars: '#FFD8B1',
  robe_hooks: '#000075',
  robeHooks: '#000075',
  towel_rings: '#A9A9A9',
  towelRings: '#A9A9A9',
  toilet_flush: '#FFFAC8',
  toiletFlush: '#FFFAC8',
  vanity_backsplash: '#E6194B',
  vanityBacksplash: '#E6194B',
  shower_handle: '#F58231',
  showerHandle: '#F58231',
  shower_spout: '#F58231',
  showerSpout: '#F58231',
};

const NEUTRAL_SWATCH = '#9CA3AF';

function fallbackLabel(category: string): string {
  return category.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Convert a server-side `{ r, g, b }` triple to a `#RRGGBB` hex string
 * usable as a CSS color. Clamps to a valid byte range so a buggy
 * upstream value (e.g. a negative number) doesn't render as
 * `-1` → `NaN` and break the swatch.
 */
function rgbToHex(rgb: { r: number; g: number; b: number }): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  const toHex = (n: number) => clamp(n).toString(16).padStart(2, '0');
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`.toUpperCase();
}

/**
 * Build an index of drift-derived category colors keyed by every
 * variant the rest of the modal might look up — the canonical
 * camelCase key the backend sends and the snake_case form. Returns
 * `null` when the drift assessment doesn't carry `categoryColors`
 * (older rows, or runs that short-circuited before computing drift),
 * so callers can fall back to the global palette without a sentinel
 * check.
 */
export function indexDriftColors(
  driftAssessment: DriftAssessment | null | undefined,
): Map<string, string> | null {
  if (!driftAssessment?.categoryColors) return null;
  const out = new Map<string, string>();
  for (const [key, rgb] of Object.entries(driftAssessment.categoryColors)) {
    if (!rgb || typeof rgb !== 'object') continue;
    const hex = rgbToHex(rgb);
    out.set(key, hex);
    // Backend keys are camelCase; also register the snake_case form
    // so callers passing either casing land on the same swatch.
    const snake = key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
    if (snake !== key) out.set(snake, hex);
  }
  return out.size > 0 ? out : null;
}

/**
 * Resolve a `(category) -> { color, label }` lookup. Color resolution
 * is a three-tier priority chain:
 *
 * 1. The per-generation `driftAssessment.categoryColors` map, which
 *    carries the exact RGB the dollhouse renderer painted into the
 *    ground-truth PNG. This is the source-of-truth so the modal
 *    swatches match the dollhouse product map pixel-for-pixel.
 * 2. The backend `/segmentation-categories` palette (cached per
 *    session via `useSegmentationCategories`).
 * 3. The baked-in `FALLBACK_COLORS` table, used while the categories
 *    fetch is in flight or after it has failed.
 *
 * Anything that falls through every tier renders as the neutral swatch.
 */
export function buildCategoryLookup(
  entries: SegmentationCategoryMetadata[] | null,
  driftColors: Map<string, string> | null,
): CategoryLookup {
  const indexed = entries ? indexByKey(entries) : null;
  return {
    color: (category) =>
      driftColors?.get(category) ??
      indexed?.get(category)?.color ??
      FALLBACK_COLORS[category] ??
      NEUTRAL_SWATCH,
    label: (category) => indexed?.get(category)?.label ?? fallbackLabel(category),
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
    getSegmentationCategories()
      .then((data) => {
        if (!cancelled) setEntries(data);
      })
      .catch(() => {
        /* swallowed: fallback palette is in place */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return entries;
}
