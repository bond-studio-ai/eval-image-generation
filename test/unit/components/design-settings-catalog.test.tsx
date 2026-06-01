// @vitest-environment jsdom
import { waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useCatalogProducts } from "@/components/design-settings-catalog";
import { renderHookWithQuery } from "../../helpers";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useCatalogProducts", () => {
  it("loads products and indexes them by id", async () => {
    const fetchFn = vi.fn((_url: string) =>
      Promise.resolve(
        jsonResponse({
          data: [
            { id: "p1", name: "One" },
            { id: "p2", name: "Two" }
          ]
        })
      )
    );
    vi.stubGlobal("fetch", fetchFn);
    const { result } = renderHookWithQuery(() => useCatalogProducts("retailer-1"));
    await waitFor(() => {
      expect(result.current.loaded).toBe(true);
    });
    expect(result.current.products).toHaveLength(2);
    expect(result.current.byId.get("p2")).toMatchObject({ name: "Two" });
    expect(fetchFn.mock.calls[0]?.[0]).toContain("retailerId=retailer-1");
  });

  it("omits the retailer query when no id is given", async () => {
    const fetchFn = vi.fn((_url: string) => Promise.resolve(jsonResponse({ data: [] })));
    vi.stubGlobal("fetch", fetchFn);
    const { result } = renderHookWithQuery(() => useCatalogProducts());
    await waitFor(() => {
      expect(result.current.loaded).toBe(true);
    });
    expect(result.current.products).toEqual([]);
    expect(fetchFn.mock.calls[0]?.[0]).not.toContain("retailerId");
  });

  it("returns an empty list when the payload data is not an array", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(jsonResponse({ data: null })))
    );
    const { result } = renderHookWithQuery(() => useCatalogProducts());
    await waitFor(() => {
      expect(result.current.loaded).toBe(true);
    });
    expect(result.current.products).toEqual([]);
  });
});
