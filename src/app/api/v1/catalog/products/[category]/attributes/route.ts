import { errorResponse, successResponse } from '@/lib/api-response';

const CATALOG_BASE =
  process.env.CATALOG_BASE_URL ?? 'https://api.bondxlowes.com/catalog/v3/products';
const CATALOG_INCLUDE_PARAMS =
  'include[]=retailer_data&include[]=details&include[]=manufacturer_data&include[]=texture_scale&include[]=style_attributes&include[]=image';

const VALID_CATEGORIES = new Set([
  'faucets',
  'lightings',
  'lvps',
  'mirrors',
  'paints',
  'robe-hooks',
  'shelves',
  'shower-glasses',
  'shower-systems',
  'floor-tiles',
  'wall-tiles',
  'shower-wall-tiles',
  'shower-floor-tiles',
  'shower-curb-tiles',
  'toilet-paper-holders',
  'toilets',
  'towel-bars',
  'towel-rings',
  'tub-doors',
  'tub-fillers',
  'tubs',
  'vanities',
  'wallpapers',
]);

const SKIP_KEYS = new Set(['preferredRetailer', 'variants', 'images']);

function collectPaths(
  obj: Record<string, unknown>,
  paths: Set<string>,
  prefix = ''
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
  { params }: { params: Promise<{ category: string }> }
) {
  try {
    const { category } = await params;
    const segment = category.replace(/_/g, '-');
    if (!VALID_CATEGORIES.has(segment)) {
      return errorResponse('VALIDATION_ERROR', `Invalid category: ${category}`);
    }

    const url = `${CATALOG_BASE}/${segment}?perPage=1&${CATALOG_INCLUDE_PARAMS}`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) {
      return errorResponse('INTERNAL_ERROR', `Catalog API returned ${res.status}`);
    }

    const json = (await res.json()) as { data?: unknown } | unknown[];
    const data = Array.isArray(json) ? json[0] : (json as { data?: unknown }).data ?? json;
    const products = Array.isArray(data) ? data : [data];
    const product = products[0];

    if (!product || typeof product !== 'object') {
      return successResponse({ attributes: [] });
    }

    const attributes = getAttributePaths(product as Record<string, unknown>);
    return successResponse({ attributes });
  } catch (error) {
    console.error('[catalog attributes] Error:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch catalog attributes');
  }
}
