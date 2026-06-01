// @vitest-environment jsdom
import { act, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useInfiniteList } from "@/hooks/use-infinite-list";
import { renderHookWithQuery } from "../../helpers";

interface Row {
  id: number;
}

function listResponse(rows: Row[], pagination: Partial<{ page: number; limit: number; total: number; totalPages: number }> = {}) {
  return new Response(JSON.stringify({ data: rows, pagination: { page: 1, limit: 20, total: rows.length, totalPages: 1, ...pagination } }), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
}

function stubFetch(impl: (url: string) => Promise<Response>) {
  const fn = vi.fn((url: string) => impl(url));
  vi.stubGlobal("fetch", fn);
  return fn;
}

beforeEach(() => {
  window.history.replaceState(null, "", "/test");
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useInfiniteList", () => {
  it("reads initial search/page/filters from the URL and builds the request", async () => {
    window.history.replaceState(null, "", "/test?search=foo&page=2&status=active");
    const fetchFn = stubFetch(() => Promise.resolve(listResponse([{ id: 1 }], { page: 2, total: 50, totalPages: 3 })));

    const { result } = renderHookWithQuery(() => useInfiniteList<Row>("things"));
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.items).toEqual([{ id: 1 }]);
    expect(result.current.total).toBe(50);
    expect(result.current.totalPages).toBe(3);
    expect(result.current.page).toBe(2);

    const url = fetchFn.mock.calls[0]?.[0] ?? "";
    expect(url).toContain("/api/v1/image-generation/things");
    expect(url).toContain("page=2");
    expect(url).toContain("limit=20");
    expect(url).toContain("search=foo");
    expect(url).toContain("status=active");
  });

  it("goToPage changes the page and refetches; page < 1 is ignored", async () => {
    const fetchFn = stubFetch(() => Promise.resolve(listResponse([{ id: 1 }], { totalPages: 3 })));
    const { result } = renderHookWithQuery(() => useInfiniteList<Row>("things"));
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.goToPage(0);
    });
    expect(result.current.page).toBe(1);

    act(() => {
      result.current.goToPage(2);
    });
    await waitFor(() => {
      expect(result.current.page).toBe(2);
    });
    await waitFor(() => {
      expect(fetchFn.mock.calls.some(([u]) => u.includes("page=2"))).toBe(true);
    });
  });

  it("setSearch resets to page 1 and updates the search value", async () => {
    window.history.replaceState(null, "", "/test?page=3");
    stubFetch(() => Promise.resolve(listResponse([], { page: 3, totalPages: 5 })));
    const { result } = renderHookWithQuery(() => useInfiniteList<Row>("things"));
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.page).toBe(3);

    act(() => {
      result.current.setSearch("hello");
    });
    expect(result.current.search).toBe("hello");
    expect(result.current.page).toBe(1);
  });

  it("setFilters merges params and resets the page", async () => {
    const fetchFn = stubFetch(() => Promise.resolve(listResponse([])));
    const { result } = renderHookWithQuery(() => useInfiniteList<Row>("things"));
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.setFilters({ status: "active" });
    });
    expect(result.current.filters).toEqual({ status: "active" });
    await waitFor(() => {
      expect(fetchFn.mock.calls.some(([u]) => u.includes("status=active"))).toBe(true);
    });
  });

  it("honors a custom urlFor and staticParams", async () => {
    const fetchFn = stubFetch(() => Promise.resolve(listResponse([])));
    renderHookWithQuery(() => useInfiniteList<Row>("things", { urlFor: (p) => `/custom/${p}`, staticParams: { "include[]": ["frames"] } }));
    await waitFor(() => {
      expect(fetchFn).toHaveBeenCalled();
    });
    const url = decodeURIComponent(fetchFn.mock.calls[0]?.[0] ?? "");
    expect(url).toContain("/custom/things");
    expect(url).toContain("include[]=frames");
  });

  it("refresh triggers another fetch", async () => {
    const fetchFn = stubFetch(() => Promise.resolve(listResponse([])));
    const { result } = renderHookWithQuery(() => useInfiniteList<Row>("things"));
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    const before = fetchFn.mock.calls.length;
    act(() => {
      result.current.refresh();
    });
    await waitFor(() => {
      expect(fetchFn.mock.calls.length).toBeGreaterThan(before);
    });
  });

  it("syncs search state to the URL via replaceState", async () => {
    const spy = vi.spyOn(window.history, "replaceState");
    stubFetch(() => Promise.resolve(listResponse([])));
    const { result } = renderHookWithQuery(() => useInfiniteList<Row>("things", { debounceMs: 0 }));
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    act(() => {
      result.current.setSearch("query");
    });
    await waitFor(() => {
      expect(spy.mock.calls.some((call) => String(call[2]).includes("search=query"))).toBe(true);
    });
    spy.mockRestore();
  });
});
