import { errorResponse, successResponse } from '@/lib/api-response';
import { PRODUCT_CATEGORIES } from '@/lib/prompt-template-constants';

const CATALOG_BASE = 'https://api.usedemo.io/catalog/v3/products';

/** Query params to get full product data so renderAttributes and other nested fields are available. */
const CATALOG_INCLUDE_PARAMS =
  'include[]=retailer_data&include[]=details&include[]=manufacturer_data&include[]=texture_scale&include[]=style_attributes&include[]=image';

/** Kebab-case URL segments; kept in sync with Reference picker (`PRODUCT_CATEGORIES`). */
const VALID_CATEGORY_SEGMENTS = new Set(
  PRODUCT_CATEGORIES.map((k) => k.replace(/_/g, '-')),
);

const TILE_SNAKE = new Set([
  'floor_tiles',
  'wall_tiles',
  'shower_wall_tiles',
  'shower_floor_tiles',
  'shower_curb_tiles',
] as const satisfies ReadonlyArray<(typeof PRODUCT_CATEGORIES)[number]>);

const TILE_SEGMENTS = new Set([...TILE_SNAKE].map((k) => k.replace(/_/g, '-')));

function catalogSegment(segment: string): string {
  return TILE_SEGMENTS.has(segment) ? 'tiles' : segment;
}

/**
 * Normalize catalog JSON to a list of product objects (handles paginator / wrapper shapes).
 */
function extractProductRecords(json: unknown): Record<string, unknown>[] {
  if (!json || typeof json !== 'object') return [];
  const root = json as Record<string, unknown>;
  let node: unknown = root.data ?? root;

  if (Array.isArray(node)) {
    return node.filter((p): p is Record<string, unknown> => !!p && typeof p === 'object');
  }

  if (node && typeof node === 'object' && !Array.isArray(node)) {
    const o = node as Record<string, unknown>;
    if (Array.isArray(o.data)) {
      return o.data.filter((p): p is Record<string, unknown> => !!p && typeof p === 'object');
    }
    for (const key of ['items', 'products', 'results'] as const) {
      const v = o[key];
      if (Array.isArray(v)) {
        return v.filter((p): p is Record<string, unknown> => !!p && typeof p === 'object');
      }
    }
  }

  return [];
}

const SKIP_KEYS = new Set(['preferredRetailer', 'variants', 'images']);

/** Recursively collect all dot paths from a product object so nested props appear in References. */
function collectPaths(
  obj: Record<string, unknown>,
  paths: Set<string>,
  prefix = '',
): void {
  for (const [key, val] of Object.entries(obj)) {
    if (SKIP_KEYS.has(key)) continue;
    const path = prefix ? `${prefix}.${key}` : key;
    paths.add(path);
    if (val != null && typeof val === 'object' && !Array.isArray(val)) {
      collectPaths(val as Record<string, unknown>, paths, path);
    }
  }
}

function getAttributePaths(product: Record<string, unknown>): string[] {
  const paths = new Set<string>();
  collectPaths(product, paths);
  return Array.from(paths).sort();
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ category: string }> },
) {
  try {
    const { category } = await params;
    const segment = decodeURIComponent(category).replace(/_/g, '-');
    if (!VALID_CATEGORY_SEGMENTS.has(segment)) {
      return errorResponse('VALIDATION_ERROR', `Invalid category: ${category}`);
    }

    const url = `${CATALOG_BASE}/${catalogSegment(segment)}?perPage=1&${CATALOG_INCLUDE_PARAMS}`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 600 },
    });

    if (!res.ok) {
      return errorResponse('INTERNAL_ERROR', `Catalog API returned ${res.status}`);
    }

    const json: unknown = await res.json();
    const products = extractProductRecords(json);
    const product = products[0];

    if (!product) {
      return successResponse({ attributes: [] as string[] });
    }

    const attributes = getAttributePaths(product);
    return successResponse({ attributes });
  } catch (err) {
    console.error('[catalog attributes] Error:', err);
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch product attributes');
  }
}
