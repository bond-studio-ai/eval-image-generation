import { describe, expect, it } from "vitest";
import { buildStrategyRunInputFromPreset } from "@/lib/strategy-run-input";

describe("buildStrategyRunInputFromPreset", () => {
  it("maps scene images, design fields, and product image urls from a preset", () => {
    const payload = buildStrategyRunInputFromPreset({
      dollhouseView: "https://example.com/dollhouse.png",
      realPhoto: "https://example.com/photo.png",
      moodBoard: "https://example.com/mood.png",
      layoutTypeId: "layout-1",
      pkgId: "pkg-1",
      faucets_url: "https://example.com/faucet.png",
      faucet: null,
      faucetImageType: "featured-image",
      mirrorPlacement: "centered"
    });

    expect(payload.scene_images).toEqual({
      dollhouse_view: "https://example.com/dollhouse.png",
      real_photo: "https://example.com/photo.png",
      mood_board: "https://example.com/mood.png"
    });
    expect(payload.layout_type_id).toBe("layout-1");
    expect(payload.pkg_id).toBe("pkg-1");
    expect(payload.product_images["faucets"]).toEqual(["https://example.com/faucet.png"]);
    expect(payload.design).toEqual(expect.objectContaining({ mirrorPlacement: "centered" }));
  });

  it("keeps arbitrary images in both arbitrary and product image payloads", () => {
    const payload = buildStrategyRunInputFromPreset({
      faucets_url: "https://example.com/custom.png",
      faucetImageType: "arbitrary"
    });

    expect(payload.arbitrary_images).toEqual([{ url: "https://example.com/custom.png", slot: "faucet", tag: "faucet" }]);
    expect(payload.product_images["faucets"]).toEqual(["https://example.com/custom.png"]);
  });

  it("does not include selected catalog slots as product image urls", () => {
    const payload = buildStrategyRunInputFromPreset({
      faucet: "sku-1",
      faucets_url: "https://example.com/faucet.png",
      faucetImageType: "featured-image"
    });

    expect(payload.product_images["faucets"]).toBeUndefined();
  });

  it("returns an empty payload for an empty preset", () => {
    const payload = buildStrategyRunInputFromPreset({});
    expect(payload.scene_images).toEqual({});
    expect(payload.product_images).toEqual({});
    expect(payload.arbitrary_images).toEqual([]);
    expect(payload.design).toEqual({});
    expect(payload).not.toHaveProperty("layout_type_id");
    expect(payload).not.toHaveProperty("pkg_id");
  });

  it("keeps null layout/pkg ids but omits non-string non-null values", () => {
    const withNull = buildStrategyRunInputFromPreset({ layoutTypeId: null, pkgId: null });
    expect(withNull.layout_type_id).toBeNull();
    expect(withNull.pkg_id).toBeNull();

    const withNumber = buildStrategyRunInputFromPreset({ layoutTypeId: 42, pkgId: 7 });
    expect(withNumber).not.toHaveProperty("layout_type_id");
    expect(withNumber).not.toHaveProperty("pkg_id");
  });

  it("reads the first non-empty url from an array column", () => {
    const payload = buildStrategyRunInputFromPreset({ faucets_url: ["", "https://example.com/f.png"] });
    expect(payload.product_images["faucets"]).toEqual(["https://example.com/f.png"]);
  });

  it("dedupes a url shared by multiple slots mapping to the same column", () => {
    const payload = buildStrategyRunInputFromPreset({ shower_wall_tiles_url: "https://example.com/swt.png" });
    expect(payload.product_images["shower_wall_tiles"]).toEqual(["https://example.com/swt.png"]);
  });
});
