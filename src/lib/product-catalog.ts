/**
 * Product catalog lookup for enriching preset URLs with product data.
 * Used when rendering Handlebars templates with actual product data.
 * Fetches products on-demand via category-specific endpoints to avoid bulk requests.
 * Exposes nested properties: name, type (category), category, id, url, etc.
 */

const CATALOG_BASE = 'https://api.bondxlowes.com/catalog/v3/products';

type CatalogProduct = Record<string, unknown>;

/** Product data exposed to Handlebars templates. Open shape—each catalog/product type may have different attributes. */
export interface ProductItem extends Record<string, unknown> {
  url: string;
  name?: string;
  id?: string;
  type?: string;
  category?: { id: string; name: string } | null;
  productFamilyName?: string | null;
  price?: number | null;
  ourPrice?: number | null;
  salePrice?: number | null;
}

const CACHE_TTL = 10 * 60 * 1000; // 10 minutes
const productCache = new Map<string, { product: CatalogProduct; timestamp: number }>();

function extractProductIdFromUrl(url: string): string | null {
  const m = url.match(/\/products\/([0-9a-f-]{36})\//i);
  return m?.[1] ?? null;
}

function getCacheKey(category: string, productId: string): string {
  return `${category}:${productId}`;
}

/** Convert internal category (snake_case) to API URL segment (plural kebab-case). */
function categoryToUrlSegment(category: string): string {
  return category.replace(/_/g, '-');
}

async function fetchProduct(category: string, productId: string): Promise<CatalogProduct | null> {
  const key = getCacheKey(category, productId);
  const cached = productCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.product;
  }

  const segment = categoryToUrlSegment(category);
  try {
    const url = `${CATALOG_BASE}/${segment}/${productId}`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 600 },
    });

    if (!res.ok) return null;

    const json = await res.json();
    let product: CatalogProduct = json.data ?? json;
    if (Array.isArray(product) && product.length > 0) {
      product = product[0] as CatalogProduct;
    }
    if (product && typeof product === 'object') {
      productCache.set(key, { product, timestamp: Date.now() });
      return product;
    }
    return null;
  } catch (err) {
    console.error(`[product-catalog] Fetch error for ${category}/${productId}:`, err);
    return null;
  }
}

/**
 * Enrich product images (Record<category, string[]>) with full catalog data.
 * Fetches only the products needed via /products/{category-kebab}/{id}.
 * Returns the API product as-is (no mapping). Fallback { url } when fetch fails.
 * Use in templates: {{vanity.name}}, {{faucet.category.name}}, {{#if vanity}}...{{/if}}
 */
export async function enrichProductImages(
  productImages: Record<string, string[]>,
): Promise<Record<string, ProductItem[]>> {
  // Collect unique (category, productId) pairs to fetch
  const toFetch = new Map<string, { category: string; productId: string }>();

  for (const [category, urls] of Object.entries(productImages)) {
    if (!urls?.length) continue;
    for (const url of urls) {
      const productId = extractProductIdFromUrl(url);
      if (productId) {
        const key = getCacheKey(category, productId);
        toFetch.set(key, { category, productId });
      }
    }
  }

  // Fetch only necessary products (parallel, deduplicated)
  const fetched = await Promise.all(
    Array.from(toFetch.values()).map(async ({ category, productId }) => {
      const product = await fetchProduct(category, productId);
      return { key: getCacheKey(category, productId), product };
    }),
  );
  const productByKey = Object.fromEntries(fetched.map(({ key, product }) => [key, product]));

  // Build result: return product as-is, or { url } when fetch failed
  const result: Record<string, ProductItem[]> = {};
  for (const [category, urls] of Object.entries(productImages)) {
    if (!urls?.length) continue;
    result[category] = urls.map((url) => {
      const productId = extractProductIdFromUrl(url);
      const key = productId ? getCacheKey(category, productId) : null;
      const product = key ? productByKey[key] ?? null : null;
      if (product) return product as ProductItem;
      return { url };
    });
  }

  return result;
}
