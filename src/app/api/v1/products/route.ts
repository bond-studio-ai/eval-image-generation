import { errorResponse, successResponse } from '@/lib/api-response';

const CATALOG_URL =
  process.env.CATALOG_PRODUCTS_URL ?? 'https://api.bondxlowes.com/catalog/v3/products?perPage=100000';

let cachedProducts: unknown[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export async function GET() {
  try {
    const now = Date.now();
    if (cachedProducts && now - cacheTimestamp < CACHE_TTL) {
      return successResponse(cachedProducts);
    }

    const res = await fetch(CATALOG_URL, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 600 },
    });

    if (!res.ok) {
      console.error(`Catalog API returned ${res.status}`);
      if (cachedProducts) return successResponse(cachedProducts);
      return errorResponse('INTERNAL_ERROR', `Catalog API returned ${res.status}`);
    }

    const json = (await res.json()) as { data?: unknown[] } | unknown[];
    const products = Array.isArray(json) ? json : ((json as { data?: unknown[] }).data ?? []);

    cachedProducts = products;
    cacheTimestamp = now;

    return successResponse(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    if (cachedProducts) return successResponse(cachedProducts);
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch products from catalog');
  }
}
