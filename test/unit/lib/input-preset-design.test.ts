import { describe, expect, it } from "vitest";
import { getInputPresetStoredImages, readInputPresetValue } from "@/lib/input-preset-design";

describe("readInputPresetValue", () => {
  it("reads an exact key", () => {
    expect(readInputPresetValue({ vanity: "v1" }, "vanity")).toBe("v1");
  });

  it("falls back to the snake_case variant", () => {
    expect(readInputPresetValue({ floor_tile: "ft1" }, "floorTile")).toBe("ft1");
  });

  it("falls back to the camelCase variant", () => {
    expect(readInputPresetValue({ floorTile: "ft1" }, "floor_tile")).toBe("ft1");
  });

  it("returns undefined when no casing matches", () => {
    expect(readInputPresetValue({ other: 1 }, "vanity")).toBeUndefined();
  });
});

describe("getInputPresetStoredImages", () => {
  it("extracts a stored image from a legacy url column", () => {
    const images = getInputPresetStoredImages({ vanities_url: "https://cdn/v.png" });
    expect(images).toHaveLength(1);
    expect(images[0]).toMatchObject({ slot: "vanity", label: "Vanity", urlColumn: "vanities_url", url: "https://cdn/v.png" });
  });

  it("picks the first non-empty url from an array column", () => {
    const images = getInputPresetStoredImages({ faucets_url: ["", "https://cdn/f.png"] });
    expect(images[0]?.url).toBe("https://cdn/f.png");
  });

  it("marks images as arbitrary based on the slot image type", () => {
    const images = getInputPresetStoredImages({ paints_url: "https://cdn/p.png", paintImageType: "arbitrary" });
    expect(images[0]?.isArbitrary).toBe(true);
  });

  it("dedupes slots that share a legacy url column, preferring product-backed entries", () => {
    const images = getInputPresetStoredImages({
      shower_wall_tiles_url: "https://cdn/swt.png",
      showerWallTile: "product-id"
    });
    const swt = images.filter((entry) => entry.urlColumn === "shower_wall_tiles_url");
    expect(swt).toHaveLength(1);
  });

  it("returns an empty array when no url columns are set", () => {
    expect(getInputPresetStoredImages({ vanity: "v1" })).toEqual([]);
  });
});
