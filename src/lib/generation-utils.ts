import { toUrlArray } from './image-utils';

/** Product category: camelCase (DB/input) -> snake_case (evaluation form) */
const PRODUCT_COLUMN_KEYS: { camelKey: string; snakeKey: string }[] = [
  { camelKey: 'faucets', snakeKey: 'faucets' },
  { camelKey: 'lightings', snakeKey: 'lightings' },
  { camelKey: 'lvps', snakeKey: 'lvps' },
  { camelKey: 'mirrors', snakeKey: 'mirrors' },
  { camelKey: 'paints', snakeKey: 'paints' },
  { camelKey: 'robeHooks', snakeKey: 'robe_hooks' },
  { camelKey: 'shelves', snakeKey: 'shelves' },
  { camelKey: 'showerGlasses', snakeKey: 'shower_glasses' },
  { camelKey: 'showerSystems', snakeKey: 'shower_systems' },
  { camelKey: 'floorTiles', snakeKey: 'floor_tiles' },
  { camelKey: 'wallTiles', snakeKey: 'wall_tiles' },
  { camelKey: 'showerWallTiles', snakeKey: 'shower_wall_tiles' },
  { camelKey: 'showerFloorTiles', snakeKey: 'shower_floor_tiles' },
  { camelKey: 'showerCurbTiles', snakeKey: 'shower_curb_tiles' },
  { camelKey: 'toiletPaperHolders', snakeKey: 'toilet_paper_holders' },
  { camelKey: 'toilets', snakeKey: 'toilets' },
  { camelKey: 'towelBars', snakeKey: 'towel_bars' },
  { camelKey: 'towelRings', snakeKey: 'towel_rings' },
  { camelKey: 'tubDoors', snakeKey: 'tub_doors' },
  { camelKey: 'tubFillers', snakeKey: 'tub_fillers' },
  { camelKey: 'tubs', snakeKey: 'tubs' },
  { camelKey: 'vanities', snakeKey: 'vanities' },
  { camelKey: 'wallpapers', snakeKey: 'wallpapers' },
];

/**
 * Returns snake_case product category keys that have at least one image in the generation input.
 */
export function getActiveProductCategories(input: Record<string, unknown> | null | undefined): string[] {
  if (!input) return [];
  const out: string[] = [];
  for (const { camelKey, snakeKey } of PRODUCT_COLUMN_KEYS) {
    const urls = toUrlArray(input[camelKey]);
    if (urls.length > 0) out.push(snakeKey);
  }
  return out;
}
