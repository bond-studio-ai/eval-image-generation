import { errorResponse, successResponse } from '@/lib/api-response';

const CATALOG_BASE = 'https://api.bondxlowes.com/catalog/v3/products';

/** Known product categories (plural kebab-case for API). */
const VALID_CATEGORIES = new Set([
  'faucets', 'lightings', 'lvps', 'mirrors', 'paints', 'robe-hooks', 'shelves',
  'shower-glasses', 'shower-systems', 'floor-tiles', 'wall-tiles', 'shower-wall-tiles',
  'shower-floor-tiles', 'shower-curb-tiles', 'toilet-paper-holders', 'toilets',
  'towel-bars', 'towel-rings', 'tub-doors', 'tub-fillers', 'tubs', 'vanities', 'wallpapers',
]);

/** Flatten nested objects with simple {id, name} or {id, url} shape to dot paths. */
function getAttributePaths(product: Record<string, unknown>): string[] {
  const paths = new Set<string>();
  for (const [key, val] of Object.entries(product)) {
    if (['preferredRetailer', 'variants', 'images', 'renderAttributes'].includes(key)) continue;
    paths.add(key);
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      const v = val as Record<string, unknown>;
      if (v.name !== undefined) paths.add(`${key}.name`);
      if (v.id !== undefined) paths.add(`${key}.id`);
      if (v.url !== undefined) paths.add(`${key}.url`);
    }
  }
  return Array.from(paths).sort();
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ category: string }> },
) {
  try {
    const { category } = await params;
    const segment = category.replace(/_/g, '-');
    if (!VALID_CATEGORIES.has(segment)) {
      return errorResponse('VALIDATION_ERROR', `Invalid category: ${category}`);
    }

    const url = `${CATALOG_BASE}/${segment}?perPage=1`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 600 },
    });

    if (!res.ok) {
      return errorResponse('INTERNAL_ERROR', `Catalog API returned ${res.status}`);
    }

    const json = await res.json();
    const data = json.data ?? json;
    const products = Array.isArray(data) ? data : [data];
    const product = products[0];

    if (!product || typeof product !== 'object') {
      return successResponse({ attributes: [] });
    }

    const attributes = getAttributePaths(product as Record<string, unknown>);
    return successResponse({ attributes });
  } catch (err) {
    console.error('[catalog attributes] Error:', err);
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch product attributes');
  }
}
