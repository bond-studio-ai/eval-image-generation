'use client';

import { serviceUrl } from '@/lib/api-base';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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

export interface UseInfiniteListOptions {
  /** Items per page. Default 20. */
  limit?: number;
  /** Debounce delay for search input in ms. Default 300. */
  debounceMs?: number;
}

export interface UseInfiniteListReturn<T> {
  items: T[];
  loading: boolean;
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

const URL_KEY_SEARCH = 'search';
const URL_KEY_PAGE = 'page';

function readInitialParams() {
  if (typeof window === 'undefined') return { search: '', page: 1, filters: {} as Record<string, string> };
  const sp = new URLSearchParams(window.location.search);
  const search = sp.get(URL_KEY_SEARCH) ?? '';
  const page = Math.max(1, parseInt(sp.get(URL_KEY_PAGE) ?? '1', 10) || 1);
  const filters: Record<string, string> = {};
  sp.forEach((val, key) => {
    if (key === URL_KEY_SEARCH || key === URL_KEY_PAGE || key === 'limit') return;
    filters[key] = val;
  });
  return { search, page, filters };
}

export function useInfiniteList<T>(
  endpoint: string,
  options: UseInfiniteListOptions = {},
): UseInfiniteListReturn<T> {
  const { limit = 20, debounceMs = 300 } = options;

  const initial = useMemo(() => readInitialParams(), []);

  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(initial.page);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearchRaw] = useState(initial.search);
  const [debouncedSearch, setDebouncedSearch] = useState(initial.search);
  const [filters, setFiltersRaw] = useState<Record<string, string>>(initial.filters);

  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ---------------------------------------------------------------------------
  // Debounce search
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), debounceMs);
    return () => clearTimeout(timer);
  }, [search, debounceMs]);

  // ---------------------------------------------------------------------------
  // Sync state → URL via history.replaceState (no Next.js re-render)
  // ---------------------------------------------------------------------------

  const syncUrl = useCallback((s: string, f: Record<string, string>, p: number) => {
    const params = new URLSearchParams();
    if (s) params.set(URL_KEY_SEARCH, s);
    for (const [key, val] of Object.entries(f)) {
      if (val !== undefined && val !== '') params.set(key, val);
    }
    if (p > 1) params.set(URL_KEY_PAGE, String(p));

    const qs = params.toString();
    const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, '', url);
  }, []);

  const prevSyncKey = useRef(`${initial.search}|${JSON.stringify(initial.filters)}`);
  useEffect(() => {
    const key = `${debouncedSearch}|${JSON.stringify(filters)}`;
    if (key === prevSyncKey.current) return;
    prevSyncKey.current = key;
    syncUrl(debouncedSearch, filters, 1);
  }, [debouncedSearch, filters, syncUrl]);

  // ---------------------------------------------------------------------------
  // Fetch
  // ---------------------------------------------------------------------------

  const fetchPage = useCallback(
    async (pageNum: number) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);

      try {
        const qs = new URLSearchParams({
          page: String(pageNum),
          limit: String(limit),
        });
        if (debouncedSearch) qs.set('search', debouncedSearch);
        for (const [key, val] of Object.entries(filters)) {
          if (val !== undefined && val !== '') qs.set(key, val);
        }

        const res = await fetch(`${serviceUrl(endpoint)}?${qs}`, {
          signal: controller.signal,
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: ListResponse<T> = await res.json();

        if (!mountedRef.current) return;

        setItems(json.data);
        setTotal(json.pagination.total);
        setTotalPages(json.pagination.totalPages);
        setPage(pageNum);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        if (!mountedRef.current) return;
        setItems([]);
        setTotal(0);
        setTotalPages(0);
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    },
    [endpoint, limit, debouncedSearch, filters],
  );

  const initialPageRef = useRef(initial.page);
  useEffect(() => {
    const startPage = initialPageRef.current;
    initialPageRef.current = 1;
    fetchPage(startPage);
  }, [fetchPage]);

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const goToPage = useCallback(
    (p: number) => {
      if (p < 1 || p === page) return;
      syncUrl(debouncedSearch, filters, p);
      fetchPage(p);
    },
    [fetchPage, page, syncUrl, debouncedSearch, filters],
  );

  const refresh = useCallback(() => {
    fetchPage(page);
  }, [fetchPage, page]);

  const setSearch = useCallback((q: string) => {
    setSearchRaw(q);
  }, []);

  const setFilters = useCallback((f: Record<string, string>) => {
    setFiltersRaw(f);
  }, []);

  return {
    items,
    loading,
    total,
    totalPages,
    page,
    search,
    setSearch,
    filters,
    setFilters,
    goToPage,
    refresh,
  };
}
