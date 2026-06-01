// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useBatchListMachinery } from "@/app/executions/_components/use-batch-list-machinery";

let inView = false;
vi.mock("react-intersection-observer", () => ({
  useInView: () => ({ ref: vi.fn(), inView })
}));

afterEach(() => {
  inView = false;
  vi.clearAllMocks();
});

describe("useBatchListMachinery", () => {
  it("does not call loadMore when the sentinel is out of view", () => {
    const loadMore = vi.fn();
    renderHook(() => useBatchListMachinery({ hasMore: true, loadingMore: false, loadMore, refetch: () => Promise.resolve() }));
    expect(loadMore).not.toHaveBeenCalled();
  });

  it("calls loadMore when the sentinel is in view and there is more to load", () => {
    inView = true;
    const loadMore = vi.fn();
    renderHook(() => useBatchListMachinery({ hasMore: true, loadingMore: false, loadMore, refetch: () => Promise.resolve() }));
    expect(loadMore).toHaveBeenCalledTimes(1);
  });

  it("skips loadMore while a page is already loading", () => {
    inView = true;
    const loadMore = vi.fn();
    renderHook(() => useBatchListMachinery({ hasMore: true, loadingMore: true, loadMore, refetch: () => Promise.resolve() }));
    expect(loadMore).not.toHaveBeenCalled();
  });

  it("exposes refs and a scroll-preserving refetch", async () => {
    const refetch = vi.fn(() => Promise.resolve("done"));
    const { result } = renderHook(() => useBatchListMachinery({ hasMore: false, loadingMore: false, loadMore: vi.fn(), refetch }));
    expect(result.current.sentinelRef).toBeDefined();
    expect(result.current.containerRef).toBeDefined();
    await result.current.refetchKeepScroll();
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
