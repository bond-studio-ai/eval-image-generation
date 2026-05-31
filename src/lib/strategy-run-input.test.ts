import { describe, expect, it } from "vitest";
import { buildStrategyRunInputFromPreset } from "./strategy-run-input";

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
});
