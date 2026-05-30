import { toUrlArray } from '@/lib/image-utils';
import { CATEGORY_LABELS } from '@/lib/validation';
import type { ProductImageGroup } from './types';

/** All product category DB column keys (camelCase) mapped to their snake_case labels */
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

/** Derives the active product categories and grouped product images from raw input data. */
export function deriveProductImages(inputData: Record<string, unknown> | null): {
  activeProductCategories: string[];
  productImages: ProductImageGroup[];
} {
  const activeProductCategories: string[] = [];
  const productImages: ProductImageGroup[] = [];

  if (inputData) {
    for (const { camelKey, snakeKey } of PRODUCT_COLUMN_KEYS) {
      const urls = toUrlArray(inputData[camelKey]);
      if (urls.length > 0) {
        activeProductCategories.push(snakeKey);
        productImages.push({
          key: snakeKey,
          label: CATEGORY_LABELS[snakeKey] ?? snakeKey,
          urls,
        });
      }
    }
  }

  return { activeProductCategories, productImages };
}
