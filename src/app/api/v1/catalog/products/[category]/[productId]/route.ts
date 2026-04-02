import { errorResponse, successResponse } from '@/lib/api-response';

const CATALOG_BASE = 'https://api.usedemo.io/catalog/v3/products';
const CATALOG_INCLUDE_PARAMS =
  'include[]=retailer_data&include[]=details&include[]=manufacturer_data&include[]=texture_scale&include[]=style_attributes&images.tags=photo-image,tear-sheet,line-drawing';

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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ category: string; productId: string }> },
) {
  try {
    const { category, productId } = await params;
    const segment = decodeURIComponent(category).replace(/_/g, '-');
    const url = `${CATALOG_BASE}/${catalogSegment(segment)}/${encodeURIComponent(productId)}?${CATALOG_INCLUDE_PARAMS}`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 600 },
    });

    if (!res.ok) {
      return errorResponse('INTERNAL_ERROR', `Catalog API returned ${res.status}`);
    }

    const json = await res.json();
    const product = Array.isArray(json.data) ? json.data[0] : json.data ?? json;
    return successResponse(product);
  } catch (err) {
    console.error('[catalog product detail] Error:', err);
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch product details');
  }
}
