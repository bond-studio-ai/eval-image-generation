import { toUrlArray } from './image-utils';
import { CATEGORY_LABELS } from './validation';

/** Product category keys: inputKey matches the snake_case column names returned by the API. */
const PRODUCT_COLUMN_KEYS: { inputKey: string; snakeKey: string }[] = [
  { inputKey: 'faucets', snakeKey: 'faucets' },
  { inputKey: 'lightings', snakeKey: 'lightings' },
  { inputKey: 'lvps', snakeKey: 'lvps' },
  { inputKey: 'mirrors', snakeKey: 'mirrors' },
  { inputKey: 'paints', snakeKey: 'paints' },
  { inputKey: 'robe_hooks', snakeKey: 'robe_hooks' },
  { inputKey: 'shelves', snakeKey: 'shelves' },
  { inputKey: 'shower_glasses', snakeKey: 'shower_glasses' },
  { inputKey: 'shower_systems', snakeKey: 'shower_systems' },
  { inputKey: 'floor_tiles', snakeKey: 'floor_tiles' },
  { inputKey: 'wall_tiles', snakeKey: 'wall_tiles' },
  { inputKey: 'shower_wall_tiles', snakeKey: 'shower_wall_tiles' },
  { inputKey: 'shower_floor_tiles', snakeKey: 'shower_floor_tiles' },
  { inputKey: 'shower_curb_tiles', snakeKey: 'shower_curb_tiles' },
  { inputKey: 'toilet_paper_holders', snakeKey: 'toilet_paper_holders' },
  { inputKey: 'toilets', snakeKey: 'toilets' },
  { inputKey: 'towel_bars', snakeKey: 'towel_bars' },
  { inputKey: 'towel_rings', snakeKey: 'towel_rings' },
  { inputKey: 'tub_doors', snakeKey: 'tub_doors' },
  { inputKey: 'tub_fillers', snakeKey: 'tub_fillers' },
  { inputKey: 'tubs', snakeKey: 'tubs' },
  { inputKey: 'vanities', snakeKey: 'vanities' },
  { inputKey: 'wallpapers', snakeKey: 'wallpapers' },
];

/**
 * Returns snake_case product category keys that have at least one image in the generation input.
 */
export function getActiveProductCategories(input: Record<string, unknown> | null | undefined): string[] {
  if (!input) return [];
  const out: string[] = [];
  for (const { inputKey, snakeKey } of PRODUCT_COLUMN_KEYS) {
    const urls = toUrlArray(input[inputKey]);
    if (urls.length > 0) out.push(snakeKey);
  }
  return out;
}

export interface ProductImageItem {
  key: string;
  label: string;
  urls: string[];
}

/**
 * Returns product category images from generation input for display (grid, etc.).
 */
export function getProductImagesFromInput(
  input: Record<string, unknown> | null | undefined,
): ProductImageItem[] {
  if (!input) return [];
  const out: ProductImageItem[] = [];
  for (const { inputKey, snakeKey } of PRODUCT_COLUMN_KEYS) {
    const urls = toUrlArray(input[inputKey]);
    if (urls.length > 0) {
      out.push({
        key: snakeKey,
        label: CATEGORY_LABELS[snakeKey] ?? snakeKey,
        urls,
      });
    }
  }
  return out;
}
