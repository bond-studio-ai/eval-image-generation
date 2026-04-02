import { errorResponse, successResponse } from '@/lib/api-response';

const RETAILER_ID_QUERY_KEY = 'retailerId';
const baseHostname = process.env.BASE_API_HOSTNAME;
const API_BASE = baseHostname
  ? `https://${baseHostname.replace(/^https?:\/\//, '').replace(/\/$/, '')}`
  : null;

// In-memory cache keyed by retailer filter
const cachedProducts = new Map<string, Product[]>();
const cacheTimestamps = new Map<string, number>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

interface Product {
  id: string;
  name: string;
  preferredRetailer: {
    id: string;
    name: string;
  } | null;
  category: {
    id: string;
    name: string;
  } | null;
  productFamilyName: string | null;
  price: number | null;
  ourPrice: number | null;
  salePrice: number | null;
  availability: string | null;
  leadTimeDays: number | null;
  featuredImage: {
    id: string;
    url: string;
  } | null;
}

export async function GET(request: Request) {
  try {
    const now = Date.now();
    const url = new URL(request.url);
    const retailerId = url.searchParams.get(RETAILER_ID_QUERY_KEY)?.trim() ?? '';
    const cacheKey = retailerId || '__all__';

    // Return cached data if fresh
    const cached = cachedProducts.get(cacheKey);
    const cachedAt = cacheTimestamps.get(cacheKey) ?? 0;
    if (cached && now - cachedAt < CACHE_TTL) {
      return successResponse(cached);
    }

    if (!API_BASE) {
      return errorResponse('INTERNAL_ERROR', 'BASE_API_HOSTNAME is not set');
    }

    const catalogUrl = new URL('/catalog/v3/products', API_BASE);
    catalogUrl.searchParams.set('perPage', '100000');
    if (retailerId) {
      catalogUrl.searchParams.set(RETAILER_ID_QUERY_KEY, retailerId);
    }

    // Fetch from catalog API
    const res = await fetch(catalogUrl.toString(), {
      headers: { Accept: 'application/json' },
      next: { revalidate: 600 }, // Next.js fetch cache: 10 minutes
    });

    if (!res.ok) {
      console.error(`Catalog API returned ${res.status}`);
      // Return stale cache if available
      if (cached) {
        return successResponse(cached);
      }
      return errorResponse('INTERNAL_ERROR', `Catalog API returned ${res.status}`);
    }

    const json = await res.json();
    const products: Product[] = json.data ?? json;

    // Update cache
    cachedProducts.set(cacheKey, products);
    cacheTimestamps.set(cacheKey, now);

    return successResponse(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    // Return stale cache on network error
    const url = new URL(request.url);
    const retailerId = url.searchParams.get(RETAILER_ID_QUERY_KEY)?.trim() ?? '';
    const cacheKey = retailerId || '__all__';
    const cached = cachedProducts.get(cacheKey);
    if (cached) {
      return successResponse(cached);
    }
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch products from catalog');
  }
}
