// @vitest-environment jsdom
import { act, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useBatchReviewStatus } from "@/lib/use-batch-review-status";
import { renderHookWithQuery } from "../../helpers";

function stubFetch(impl: (url: string) => Promise<Response>) {
  const fn = vi.fn((url: string) => impl(url));
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useBatchReviewStatus", () => {
  it("does not probe while disabled", () => {
    const fetchFn = stubFetch(() => Promise.resolve(new Response("{}", { status: 200 })));
    const { result } = renderHookWithQuery(() => useBatchReviewStatus(["g1"], false));
    expect(result.current.statuses.size).toBe(0);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("maps 200 to done and 404 to idle", async () => {
    stubFetch((url) => Promise.resolve(new Response("{}", { status: url.includes("g1") ? 200 : 404 })));
    const { result } = renderHookWithQuery(() => useBatchReviewStatus(["g1", "g2"], true));
    await waitFor(() => {
      expect(result.current.statuses.get("g1")?.kind).toBe("done");
      expect(result.current.statuses.get("g2")?.kind).toBe("idle");
    });
  });

  it("lets setStatus override the cached probe result", async () => {
    stubFetch(() => Promise.resolve(new Response("{}", { status: 404 })));
    const { result } = renderHookWithQuery(() => useBatchReviewStatus(["g1"], true));
    await waitFor(() => {
      expect(result.current.statuses.get("g1")?.kind).toBe("idle");
    });
    act(() => {
      result.current.setStatus("g1", { kind: "running" });
    });
    await waitFor(() => {
      expect(result.current.statuses.get("g1")?.kind).toBe("running");
    });
  });
});
