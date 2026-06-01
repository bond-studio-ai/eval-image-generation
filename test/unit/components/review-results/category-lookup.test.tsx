// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildCategoryLookup, useSegmentationCategories } from "@/components/review-results/category-lookup";
import type * as SegModule from "@/lib/segmentation-categories";

type SegmentationCategoryMetadata = SegModule.SegmentationCategoryMetadata;

vi.mock("@/lib/segmentation-categories", async (importOriginal) => {
  const actual = await importOriginal<typeof SegModule>();
  return { ...actual, getSegmentationCategories: vi.fn() };
});

const { getSegmentationCategories } = await import("@/lib/segmentation-categories");
const mockedGet = vi.mocked(getSegmentationCategories);

function meta(key: string, color: string, label: string): SegmentationCategoryMetadata {
  return { key, label, color, samPrompt: key, isExtra: false, group: key, groupPrompts: [], resolvedPromptSlugs: [key], resolutionKind: "union" };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("buildCategoryLookup", () => {
  it("uses the baked-in fallback palette when no entries are provided", () => {
    const lookup = buildCategoryLookup(null);
    expect(lookup.color("vanities")).toBe("#E6194B");
    expect(lookup.label("shower_wall_tiles")).toBe("Shower Wall Tiles");
  });

  it("falls back to the neutral swatch for unknown categories", () => {
    expect(buildCategoryLookup(null).color("totally_unknown")).toBe("#9CA3AF");
  });

  it("prefers backend entries (by snake or camel key) over the fallback", () => {
    const lookup = buildCategoryLookup([meta("wall_tiles", "#123456", "Backend Wall")]);
    expect(lookup.color("wall_tiles")).toBe("#123456");
    expect(lookup.color("wallTiles")).toBe("#123456");
    expect(lookup.label("wallTiles")).toBe("Backend Wall");
  });
});

describe("useSegmentationCategories", () => {
  it("returns null until the fetch resolves, then the entries", async () => {
    const entries = [meta("faucets", "#3CB44B", "Faucets")];
    mockedGet.mockResolvedValue(entries);
    const { result } = renderHook(() => useSegmentationCategories());
    expect(result.current).toBeNull();
    await waitFor(() => {
      expect(result.current).toEqual(entries);
    });
  });

  it("swallows fetch errors and stays null", async () => {
    mockedGet.mockRejectedValue(new Error("down"));
    const { result } = renderHook(() => useSegmentationCategories());
    await waitFor(() => {
      expect(mockedGet).toHaveBeenCalled();
    });
    expect(result.current).toBeNull();
  });
});
