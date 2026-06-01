"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDebounceValue } from "usehooks-ts";
import { serviceUrl } from "@/lib/api-base";

interface PaginationResponse {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ListResponse<T> {
  data: T[];
  pagination: PaginationResponse;
}

/**
 * Static query params attached to every request the hook makes. Use for
 * response-shape modifiers (e.g. `include[]=frames`) that aren't part of the
 * user's filter UI. Values may repeat — pass an array for multi-valued keys.
 */
export type StaticParams = Record<string, string | string[]>;

export interface UseInfiniteListOptions {
  /** Items per page. Default 20. */
  limit?: number;
  /** Debounce delay for search input in ms. Default 300. */
  debounceMs?: number;
  /**
   * Build the full URL for an endpoint path. Defaults to `serviceUrl` (image-
   * generation v1 proxy). Use `localUrl` for the projects BFF, `serviceV2Url`
   * for the v2 image-gen proxy. All upstreams must speak the same `{ page,
   * limit, total, totalPages }` pagination shape — that's enforced by the
   * relevant BFF route, not by the hook.
   */
  urlFor?: (path: string) => string;
  /**
   * Extra always-on query params. Not URL-persisted, not exposed via
   * `filters`/`setFilters` — for response-shape modifiers like
   * `include[]=frames` that shouldn't appear to the user as filter state.
   */
  staticParams?: StaticParams;
}

export interface UseInfiniteListReturn<T> {
  items: T[];
  loading: boolean;
  /** True when fetching a new page while keeping current data visible. */
  paginating: boolean;
  total: number;
  totalPages: number;
  page: number;
  search: string;
  setSearch: (q: string) => void;
  filters: Record<string, string>;
  setFilters: (f: Record<string, string>) => void;
  goToPage: (page: number) => void;
  refresh: () => void;
}

const URL_KEY_SEARCH = "search";
const URL_KEY_PAGE = "page";

function readInitialParams() {
  if (typeof window === "undefined") return { search: "", page: 1, filters: {} as Record<string, string> };
  const sp = new URLSearchParams(window.location.search);
  const search = sp.get(URL_KEY_SEARCH) ?? "";
  const page = Math.max(1, Number.parseInt(sp.get(URL_KEY_PAGE) ?? "1", 10) || 1);
  const filters: Record<string, string> = {};
  sp.forEach((val, key) => {
    if (key === URL_KEY_SEARCH || key === URL_KEY_PAGE || key === "limit") return;
    filters[key] = val;
  });
  return { search, page, filters };
}

function appendStaticParams(qs: URLSearchParams, staticParams: StaticParams | undefined): void {
  if (!staticParams) return;
  for (const [key, value] of Object.entries(staticParams)) {
    if (Array.isArray(value)) {
      for (const item of value) qs.append(key, item);
    } else {
      qs.append(key, value);
    }
  }
}

export function useInfiniteList<T>(endpoint: string, options: UseInfiniteListOptions = {}): UseInfiniteListReturn<T> {
  const { limit = 20, debounceMs = 300, urlFor = serviceUrl, staticParams } = options;

  const initial = useMemo(() => readInitialParams(), []);

  const [page, setPage] = useState(initial.page);
  const [search, setSearchRaw] = useState(initial.search);
  const [debouncedSearch] = useDebounceValue(search, debounceMs);
  const [filters, setFiltersRaw] = useState<Record<string, string>>(initial.filters);

  // Stable identities for keying: staticParams and filters as their serialized
  // shape, so a fresh object literal from the caller doesn't churn the query.
  const staticParamsKey = useMemo(() => JSON.stringify(staticParams ?? null), [staticParams]);
  const filtersKey = JSON.stringify(filters);

  const { data, isLoading, isPlaceholderData, refetch } = useQuery({
    queryKey: [endpoint, limit, debouncedSearch, filtersKey, page, staticParamsKey] as const,
    queryFn: async ({ signal }): Promise<ListResponse<T>> => {
      const qs = new URLSearchParams();
      qs.set("page", String(page));
      qs.set("limit", String(limit));
      if (debouncedSearch) qs.set("search", debouncedSearch);
      for (const [key, val] of Object.entries(filters)) {
        if (val !== undefined && val !== "") qs.set(key, val);
      }
      appendStaticParams(qs, staticParams);

      const res = await fetch(`${urlFor(endpoint)}?${qs}`, { signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as ListResponse<T>;
    },
    // Keep the current page visible while the next one loads (drives `paginating`).
    placeholderData: keepPreviousData
  });

  const items = data?.data ?? [];
  const total = data?.pagination.total ?? 0;
  const totalPages = data?.pagination.totalPages ?? 0;

  // Mirror state into the URL via history.replaceState — shallow, no Next.js
  // navigation, no history pollution.
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set(URL_KEY_SEARCH, debouncedSearch);
    for (const [key, val] of Object.entries(filters)) {
      if (val !== undefined && val !== "") params.set(key, val);
    }
    if (page > 1) params.set(URL_KEY_PAGE, String(page));
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `${window.location.pathname}?${qs}` : window.location.pathname);
  }, [debouncedSearch, filters, page]);

  const goToPage = useCallback((targetPage: number) => {
    if (targetPage < 1) return;
    setPage(targetPage);
  }, []);

  const refresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  // Changing the search or filters resets to the first page (the prior page may
  // not exist in the new result set).
  const setSearch = useCallback((value: string) => {
    setSearchRaw(value);
    setPage(1);
  }, []);

  const setFilters = useCallback((nextFilters: Record<string, string>) => {
    setFiltersRaw(nextFilters);
    setPage(1);
  }, []);

  return {
    items,
    loading: isLoading,
    paginating: isPlaceholderData,
    total,
    totalPages,
    page,
    search,
    setSearch,
    filters,
    setFilters,
    goToPage,
    refresh
  };
}
