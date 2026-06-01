import { afterEach, describe, expect, it, vi } from "vitest";
import { indexByKey, type SegmentationCategoryMetadata } from "@/lib/segmentation-categories";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function category(key: string): SegmentationCategoryMetadata {
  return {
    key,
    label: key,
    color: "#000000",
    samPrompt: key,
    isExtra: false,
    group: key,
    groupPrompts: [],
    resolvedPromptSlugs: [key],
    resolutionKind: "union"
  };
}

describe("indexByKey", () => {
  it("registers the snake_case key and its camelCase alias", () => {
    const map = indexByKey([category("shower_wall_tiles")]);
    expect(map.get("shower_wall_tiles")?.key).toBe("shower_wall_tiles");
    expect(map.get("showerWallTiles")?.key).toBe("shower_wall_tiles");
  });

  it("registers a single entry when the key has no snake parts", () => {
    const map = indexByKey([category("toilets")]);
    expect(map.size).toBe(1);
    expect(map.get("toilets")?.key).toBe("toilets");
  });
});

async function freshModule() {
  vi.resetModules();
  return import("@/lib/segmentation-categories");
}

describe("getSegmentationCategories", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("fetches once and caches the resolved promise for the session", async () => {
    const fetchFn = vi.fn((_url: string) => Promise.resolve(jsonResponse({ data: [category("faucets")] })));
    vi.stubGlobal("fetch", fetchFn);
    const mod = await freshModule();

    const first = await mod.getSegmentationCategories();
    const second = await mod.getSegmentationCategories();
    expect(first).toBe(second);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn.mock.calls[0]?.[0]).toContain("segmentation-categories");
  });

  it("clears the cache on failure so the next call retries", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(new Response("nope", { status: 500, statusText: "Server Error" }))
      .mockResolvedValueOnce(jsonResponse({ data: [category("mirrors")] }));
    vi.stubGlobal("fetch", fetchFn);
    const mod = await freshModule();

    await expect(mod.getSegmentationCategories()).rejects.toThrow(/Failed to fetch segmentation categories/);
    const retry = await mod.getSegmentationCategories();
    expect(retry[0]?.key).toBe("mirrors");
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("throws when the response body is malformed", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(jsonResponse({ data: "not-an-array" })))
    );
    const mod = await freshModule();
    await expect(mod.getSegmentationCategories()).rejects.toThrow(/Malformed/);
  });
});
