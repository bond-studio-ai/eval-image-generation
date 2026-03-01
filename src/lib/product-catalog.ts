/**
 * Product catalog lookup for enriching preset URLs with product data.
 * Used when rendering Handlebars templates with actual product data.
 * Exposes nested properties: name, type (category), category, id, url, etc.
 */

const CATALOG_URL = 'https://api.bondxlowes.com/catalog/v3/products?perPage=100000';

interface CatalogProduct {
  id: string;
  name: string;
  preferredRetailer: { id: string; name: string } | null;
  category: { id: string; name: string } | null;
  productFamilyName: string | null;
  price: number | null;
  ourPrice: number | null;
  salePrice: number | null;
  availability: string | null;
  leadTimeDays: number | null;
  featuredImage: { id: string; url: string } | null;
}

/** Product data exposed to Handlebars templates. Open shape—each product type may have different attributes. */
export interface ProductItem extends Record<string, unknown> {
  url: string;
  name: string;
  id?: string;
  type?: string;
  category?: { id: string; name: string } | null;
  productFamilyName?: string | null;
  price?: number | null;
  ourPrice?: number | null;
  salePrice?: number | null;
}

let cachedProducts: CatalogProduct[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

function extractProductIdFromUrl(url: string): string | null {
  const m = url.match(/\/products\/([0-9a-f-]{36})\//i);
  return m?.[1] ?? null;
}

export async function fetchProducts(): Promise<CatalogProduct[]> {
  const now = Date.now();
  if (cachedProducts && now - cacheTimestamp < CACHE_TTL) {
    return cachedProducts;
  }

  try {
    const res = await fetch(CATALOG_URL, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 600 },
    });

    if (!res.ok) {
      if (cachedProducts) return cachedProducts;
      return [];
    }

    const json = await res.json();
    const products: CatalogProduct[] = json.data ?? json;
    cachedProducts = products;
    cacheTimestamp = now;
    return products;
  } catch (err) {
    console.error('[product-catalog] Fetch error:', err);
    return cachedProducts ?? [];
  }
}

function buildUrlToProductMap(products: CatalogProduct[]): Map<string, CatalogProduct> {
  const map = new Map<string, CatalogProduct>();
  for (const p of products) {
    if (p.featuredImage?.url) map.set(p.featuredImage.url, p);
    map.set(p.id, p);
  }
  return map;
}

function toProductItem(url: string, product: CatalogProduct | null): ProductItem {
  if (!product) {
    return { url, name: '', id: '', type: '', category: null, productFamilyName: null, price: null, ourPrice: null, salePrice: null };
  }
  return {
    url,
    type: product.category?.name ?? '',
    ...product,
  };
}

/**
 * Enrich product images (Record<category, string[]>) with full catalog data.
 * Each product has: url, name, id, type (category name), category, productFamilyName, price, ourPrice, salePrice.
 * Use in templates: {{vanity.type}}, {{faucet.name}}, {{#if vanity}}...{{/if}}
 */
export async function enrichProductImages(
  productImages: Record<string, string[]>,
): Promise<Record<string, ProductItem[]>> {
  const products = await fetchProducts();
  const lookup = buildUrlToProductMap(products);

  const result: Record<string, ProductItem[]> = {};

  for (const [category, urls] of Object.entries(productImages)) {
    if (!urls?.length) continue;
    result[category] = urls.map((url) => {
      let product = lookup.get(url) ?? null;
      if (!product) {
        const pid = extractProductIdFromUrl(url);
        if (pid) product = lookup.get(pid) ?? null;
      }
      return toProductItem(url, product);
    });
  }

  return result;
}
