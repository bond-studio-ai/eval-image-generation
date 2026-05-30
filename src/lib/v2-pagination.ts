/**
 * Helpers for translating between the v1 pagination convention used by the
 * eval-image-generation BFF (`page`/`limit`/`totalPages`) and the v2 convention
 * used upstream by image-generation v2 and the platform projects service
 * (`currentPage`/`perPage`/`lastPage`).
 *
 * Keeping the translation in one place lets the BFF speak a single shape to the
 * browser; `useInfiniteList` stays oblivious to the upstream version.
 */

import type { ProxyJsonTransformer, ProxyQueryRewriter } from "./proxy-handler";

const V1_TO_V2_KEY: Record<string, string> = {
  page: "currentPage",
  limit: "perPage"
};

/**
 * Translates inbound `?page=X&limit=Y` query params into the upstream's
 * `?currentPage=X&perPage=Y` form. Other params pass through unchanged.
 */
export const rewriteV1PaginationToV2: ProxyQueryRewriter = (params) => {
  let touched = false;
  const next = new URLSearchParams();
  params.forEach((value, key) => {
    const mapped = V1_TO_V2_KEY[key];
    if (mapped !== undefined) {
      next.append(mapped, value);
      touched = true;
    } else {
      next.append(key, value);
    }
  });
  return touched ? next : params;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

/**
 * Translates a v2-style `pagination` object (with `currentPage`/`perPage`/
 * `lastPage`) into the v1 shape (`page`/`limit`/`totalPages`). Leaves
 * unrelated keys alone. Returns the original input if it doesn't look like a
 * paginated response.
 */
export const normalizeV2PaginationResponse: ProxyJsonTransformer = (json) => {
  if (!isPlainObject(json)) return json;
  const pag = isPlainObject(json.pagination) ? (json.pagination as Record<string, unknown>) : null;
  if (!pag) return json;
  const currentPage = typeof pag.currentPage === "number" ? pag.currentPage : undefined;
  const perPage = typeof pag.perPage === "number" ? pag.perPage : undefined;
  const lastPage = typeof pag.lastPage === "number" ? pag.lastPage : undefined;
  const total = typeof pag.total === "number" ? pag.total : undefined;
  if (currentPage === undefined && perPage === undefined && lastPage === undefined) {
    return json;
  }
  return {
    ...json,
    pagination: {
      ...pag,
      ...(currentPage !== undefined ? { page: currentPage } : {}),
      ...(perPage !== undefined ? { limit: perPage } : {}),
      ...(lastPage !== undefined ? { totalPages: lastPage } : {}),
      ...(total !== undefined ? { total } : {})
    }
  };
};
