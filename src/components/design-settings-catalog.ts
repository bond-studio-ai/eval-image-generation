"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { CatalogProduct } from "@/components/design-settings-fields";
import { localUrl } from "@/lib/api-base";

export function useCatalogProducts(retailerId?: string) {
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["catalog-products", retailerId],
    queryFn: async ({ signal }) => {
      const query = retailerId ? `?retailerId=${encodeURIComponent(retailerId)}` : "";
      const res = await fetch(localUrl(`products${query}`), { signal });
      if (!res.ok) throw new Error(`Failed to fetch catalog products (${res.status})`);
      const json = (await res.json()) as { data?: unknown };
      return Array.isArray(json.data) ? (json.data as CatalogProduct[]) : [];
    }
  });

  const byId = useMemo(() => {
    const map = new Map<string, CatalogProduct>();
    for (const product of products) map.set(product.id, product);
    return map;
  }, [products]);

  return { products, byId, loaded: !isLoading };
}
