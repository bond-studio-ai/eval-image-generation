import { describe, expect, it } from "vitest";
import { deriveProductImages } from "@/app/generations/[id]/_components/generation-data";

describe("deriveProductImages", () => {
  it("returns empty results for null input", () => {
    expect(deriveProductImages(null)).toEqual({ activeProductCategories: [], productImages: [] });
  });

  it("maps populated camelCase columns to snake_case categories and groups urls", () => {
    const { activeProductCategories, productImages } = deriveProductImages({
      faucets: "https://cdn/faucet.png",
      robeHooks: ["https://cdn/hook1.png", "https://cdn/hook2.png"],
      mirrors: []
    });
    expect(activeProductCategories).toEqual(["faucets", "robe_hooks"]);
    expect(productImages).toEqual([
      { key: "faucets", label: expect.any(String), urls: ["https://cdn/faucet.png"] },
      { key: "robe_hooks", label: expect.any(String), urls: ["https://cdn/hook1.png", "https://cdn/hook2.png"] }
    ]);
  });

  it("ignores columns with no usable urls", () => {
    expect(deriveProductImages({ vanities: 42, toilets: null })).toEqual({ activeProductCategories: [], productImages: [] });
  });
});
