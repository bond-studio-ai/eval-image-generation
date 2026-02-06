import { errorResponse, successResponse } from '@/lib/api-response';

const CATALOG_URL = 'https://api.bondxlowes.com/catalog/v3/products?perPage=100000';

// In-memory cache
let cachedProducts: Product[] | null = null;
let cacheTimestamp = 0;
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

export async function GET() {
  try {
    const now = Date.now();

    // Return cached data if fresh
    if (cachedProducts && now - cacheTimestamp < CACHE_TTL) {
      return successResponse(cachedProducts);
    }

    // Fetch from catalog API
    const res = await fetch(CATALOG_URL, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 600 }, // Next.js fetch cache: 10 minutes
    });

    if (!res.ok) {
      console.error(`Catalog API returned ${res.status}`);
      // Return stale cache if available
      if (cachedProducts) {
        return successResponse(cachedProducts);
      }
      return errorResponse('INTERNAL_ERROR', `Catalog API returned ${res.status}`);
    }

    const json = await res.json();
    const products: Product[] = json.data ?? json;

    // Update cache
    cachedProducts = products;
    cacheTimestamp = now;

    return successResponse(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    // Return stale cache on network error
    if (cachedProducts) {
      return successResponse(cachedProducts);
    }
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch products from catalog');
  }
}
