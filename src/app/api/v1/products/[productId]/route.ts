import { errorResponse, successResponse } from "@/lib/api-response";

const CATALOG_BASE = "https://api.usedemo.io/catalog/v3/products";

export async function GET(_request: Request, { params }: { params: Promise<{ productId: string }> }) {
  try {
    const { productId } = await params;

    const res = await fetch(`${CATALOG_BASE}/${productId}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 600 }
    });

    if (!res.ok) {
      return errorResponse("INTERNAL_ERROR", `Catalog API returned ${res.status}`);
    }

    const json = (await res.json()) as { data?: unknown };
    const product: unknown = Array.isArray(json.data) ? json.data[0] : json.data;

    return successResponse(product);
  } catch (error) {
    console.error("[product detail] Error:", error);
    return errorResponse("INTERNAL_ERROR", "Failed to fetch product details");
  }
}
