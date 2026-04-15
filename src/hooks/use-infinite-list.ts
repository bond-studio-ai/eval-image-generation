'use client';

import { serviceUrl } from '@/lib/api-base';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface PaginationResponse {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
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
  /**
   * `'infinite'` — accumulates rows on scroll (page kept in state only).
   * `'pages'` — traditional pagination with page synced to URL.
   * Default `'infinite'`.
   */
  paginate?: 'infinite' | 'pages';
}

export interface UseInfiniteListReturn<T> {
  items: T[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  total: number;
  totalPages: number;
  page: number;
  search: string;
  setSearch: (q: string) => void;
  filters: Record<string, string>;
  setFilters: (f: Record<string, string>) => void;
  /** Infinite scroll: fetch and append next page. */
  loadMore: () => void;
  /** Page mode: navigate to a specific page. */
  goToPage: (page: number) => void;
  /** Re-fetch from page 1 (call after mutations). */
  refresh: () => void;
}

// Keys the hook writes to the URL. Other query params are left untouched.
const URL_KEY_SEARCH = 'search';
const URL_KEY_PAGE = 'page';

export function useInfiniteList<T>(
  endpoint: string,
  options: UseInfiniteListOptions = {},
): UseInfiniteListReturn<T> {
  const { limit = 20, debounceMs = 300, paginate = 'infinite' } = options;
  const isPageMode = paginate === 'pages';

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // ---------------------------------------------------------------------------
  // Initialise from URL
  // ---------------------------------------------------------------------------

  const initialSearch = searchParams.get(URL_KEY_SEARCH) ?? '';
  const initialPage = isPageMode
    ? Math.max(1, parseInt(searchParams.get(URL_KEY_PAGE) ?? '1', 10) || 1)
    : 1;

  const initialFilters = useMemo(() => {
    const f: Record<string, string> = {};
    searchParams.forEach((val, key) => {
      if (key === URL_KEY_SEARCH || key === URL_KEY_PAGE || key === 'limit') return;
      f[key] = val;
    });
    return f;
    // Only run on mount — searchParams reference changes on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(initialPage);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearchRaw] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [filters, setFiltersRaw] = useState<Record<string, string>>(initialFilters);

  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Debounce search
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), debounceMs);
    return () => clearTimeout(timer);
  }, [search, debounceMs]);

  // ---------------------------------------------------------------------------
  // Sync state → URL (replaceState to avoid polluting history)
  // ---------------------------------------------------------------------------

  const syncUrl = useCallback(
    (s: string, f: Record<string, string>, p: number) => {
      const params = new URLSearchParams();
      if (s) params.set(URL_KEY_SEARCH, s);
      for (const [key, val] of Object.entries(f)) {
        if (val !== undefined && val !== '') params.set(key, val);
      }
      if (isPageMode && p > 1) params.set(URL_KEY_PAGE, String(p));

      const qs = params.toString();
      const url = qs ? `${pathname}?${qs}` : pathname;
      router.replace(url, { scroll: false });
    },
    [pathname, router, isPageMode],
  );

  // Sync when debounced search or filters change (resets to page 1)
  const prevSyncKey = useRef('');
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
    async (pageNum: number, append: boolean) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

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

        if (append) {
          setItems((prev) => [...prev, ...json.data]);
        } else {
          setItems(json.data);
        }

        setTotal(json.pagination.total);
        setTotalPages(json.pagination.total_pages);
        setHasMore(pageNum < json.pagination.total_pages);
        setPage(pageNum);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        if (!mountedRef.current) return;
        if (!append) {
          setItems([]);
          setTotal(0);
          setTotalPages(0);
          setHasMore(false);
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [endpoint, limit, debouncedSearch, filters],
  );

  useEffect(() => {
    fetchPage(isPageMode ? initialPage : 1, false);
    // initialPage only matters on mount for page mode
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchPage]);

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const loadMore = useCallback(() => {
    if (loadingMore || loading || !hasMore) return;
    fetchPage(page + 1, true);
  }, [fetchPage, page, loadingMore, loading, hasMore]);

  const goToPage = useCallback(
    (p: number) => {
      if (p < 1 || p === page) return;
      syncUrl(debouncedSearch, filters, p);
      fetchPage(p, false);
    },
    [fetchPage, page, syncUrl, debouncedSearch, filters],
  );

  const refresh = useCallback(() => {
    fetchPage(isPageMode ? page : 1, false);
  }, [fetchPage, isPageMode, page]);

  const setSearch = useCallback((q: string) => {
    setSearchRaw(q);
  }, []);

  const setFilters = useCallback((f: Record<string, string>) => {
    setFiltersRaw(f);
  }, []);

  return {
    items,
    loading,
    loadingMore,
    hasMore,
    total,
    totalPages,
    page,
    search,
    setSearch,
    filters,
    setFilters,
    loadMore,
    goToPage,
    refresh,
  };
}
