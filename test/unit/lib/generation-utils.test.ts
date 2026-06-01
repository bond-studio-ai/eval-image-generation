import { describe, expect, it } from "vitest";
import { getActiveProductCategories, getProductImagesFromInput } from "@/lib/generation-utils";

describe("getActiveProductCategories", () => {
  it("returns snake_case keys for categories with images", () => {
    const result = getActiveProductCategories({ faucets: ["a.png"], robeHooks: ["b.png"], mirrors: [] });
    expect(result).toContain("faucets");
    expect(result).toContain("robe_hooks");
    expect(result).not.toContain("mirrors");
  });

  it("returns an empty array for null/empty input", () => {
    expect(getActiveProductCategories(null)).toEqual([]);
    expect(getActiveProductCategories({})).toEqual([]);
  });
});

describe("getProductImagesFromInput", () => {
  it("returns display items with labels and urls", () => {
    const result = getProductImagesFromInput({ faucets: ["a.png", "b.png"] });
    expect(result).toEqual([{ key: "faucets", label: "Faucets", urls: ["a.png", "b.png"] }]);
  });

  it("falls back to the raw key when no label exists", () => {
    const result = getProductImagesFromInput({ showerGlasses: "g.png" });
    expect(result[0]).toMatchObject({ key: "shower_glasses", label: "Shower Glasses", urls: ["g.png"] });
  });

  it("returns an empty array for null input", () => {
    expect(getProductImagesFromInput(null)).toEqual([]);
  });
});
