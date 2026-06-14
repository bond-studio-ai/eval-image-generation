import { errorResponse, successResponse } from "@/lib/api-response";
import { catalogProductsBase } from "@/lib/env";
import { logger } from "@/lib/logger";

export async function GET(_request: Request, { params }: { params: Promise<{ productId: string }> }) {
  try {
    const { productId } = await params;

    const res = await fetch(`${catalogProductsBase()}/${productId}`, {
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
    logger.error("[product detail] Error:", error);
    return errorResponse("INTERNAL_ERROR", "Failed to fetch product details");
  }
}
