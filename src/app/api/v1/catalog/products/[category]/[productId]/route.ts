import { errorResponse, successResponse } from '@/lib/api-response';

const CATALOG_BASE = 'https://api.usedemo.io/catalog/v3/products';
const CATALOG_INCLUDE_PARAMS =
  'include[]=retailer_data&include[]=details&include[]=manufacturer_data&include[]=texture_scale&include[]=style_attributes&include[]=components&images.tags=photo-image,tear-sheet,line-drawing';

const TILE_SEGMENTS = new Set([
  'floor-tiles',
  'wall-tiles',
  'shower-wall-tiles',
  'shower-floor-tiles',
  'shower-curb-tiles',
]);

function catalogSegment(segment: string): string {
  return TILE_SEGMENTS.has(segment) ? 'tiles' : segment;
}

function firstCatalogProduct(json: unknown): unknown | null {
  const payload = json && typeof json === 'object' ? (json as { data?: unknown }) : null;
  const raw = payload && 'data' in payload ? payload.data : json;
  if (Array.isArray(raw)) return raw[0] ?? null;
  return raw ?? null;
}

async function fetchCatalogProduct(segment: string, productId: string): Promise<unknown | null> {
  const url = `${CATALOG_BASE}/${segment}/${encodeURIComponent(productId)}?${CATALOG_INCLUDE_PARAMS}`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 600 },
  });

  if (!res.ok) {
    throw new Error(`Catalog API returned ${res.status}`);
  }

  return firstCatalogProduct(await res.json());
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ category: string; productId: string }> },
) {
  try {
    const { category, productId } = await params;
    const requestedSegment = decodeURIComponent(category).replace(/_/g, '-');
    const segment = catalogSegment(requestedSegment);
    let product = await fetchCatalogProduct(segment, productId);

    if (!product && segment === 'tiles') {
      product = await fetchCatalogProduct('lvps', productId);
    }

    return successResponse(product);
  } catch (err) {
    console.error('[catalog product detail] Error:', err);
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch product details');
  }
}
