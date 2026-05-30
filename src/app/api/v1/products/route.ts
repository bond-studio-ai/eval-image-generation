import { errorResponse, successResponse } from "@/lib/api-response";
import { platformApiBase } from "@/lib/env";

const RETAILER_ID_QUERY_KEY = "retailerId";

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
    const url = new URL(request.url);
    const retailerId = url.searchParams.get(RETAILER_ID_QUERY_KEY)?.trim() ?? "";

    const catalogUrl = new URL("/catalog/v3/products", platformApiBase());
    catalogUrl.searchParams.set("perPage", "100000");
    if (retailerId) {
      catalogUrl.searchParams.set(RETAILER_ID_QUERY_KEY, retailerId);
    }

    // Next.js fetch cache (10 minutes) provides the read-through caching layer.
    const res = await fetch(catalogUrl.toString(), {
      headers: { Accept: "application/json" },
      next: { revalidate: 600 }
    });

    if (!res.ok) {
      console.error(`Catalog API returned ${res.status}`);
      return errorResponse("INTERNAL_ERROR", `Catalog API returned ${res.status}`);
    }

    const json = await res.json();
    const products: Product[] = json.data ?? json;

    return successResponse(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    return errorResponse("INTERNAL_ERROR", "Failed to fetch products from catalog");
  }
}
