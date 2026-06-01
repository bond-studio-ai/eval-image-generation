import { describe, expect, it } from "vitest";
import {
  asNumber,
  asRecord,
  asString,
  buildObject,
  buildSurface,
  getAssetId,
  getScanContext,
  getShowers,
  getTextureScale,
  isScanLike,
  pickHcl,
  projectColorPalette,
  projectComponents,
  projectTileExtras,
  resolveTilePattern,
  visibilityStyling
} from "@/lib/design-materials-build";
import type { CatalogProduct, ScanLike } from "@/lib/design-materials-types";

describe("coercion guards", () => {
  it("asRecord accepts plain objects only", () => {
    expect(asRecord({ a: 1 })).toEqual({ a: 1 });
    expect(asRecord([1])).toBeNull();
    expect(asRecord(null)).toBeNull();
    expect(asRecord("x")).toBeNull();
  });

  it("asNumber parses numbers and numeric strings", () => {
    expect(asNumber(5)).toBe(5);
    expect(asNumber("5.5")).toBe(5.5);
    expect(asNumber("  ")).toBeNull();
    expect(asNumber("abc")).toBeNull();
    expect(asNumber(Number.NaN)).toBeNull();
  });

  it("asString requires non-blank strings", () => {
    expect(asString("hi")).toBe("hi");
    expect(asString("   ")).toBeNull();
    expect(asString(5)).toBeNull();
  });

  it("pickHcl requires all three channels", () => {
    expect(pickHcl({ hue: 1, chroma: 2, luminance: 3 })).toEqual({ hue: 1, chroma: 2, luminance: 3 });
    expect(pickHcl({ hue: 1, chroma: 2 })).toBeNull();
    expect(pickHcl(null)).toBeNull();
  });
});

describe("projectColorPalette", () => {
  it("extracts HCL colors from colorPalette entries", () => {
    const product: CatalogProduct = { colorPalette: [{ color: { hue: 1, chroma: 2, luminance: 3 } }, { hue: 4, chroma: 5, luminance: 6 }] };
    expect(projectColorPalette(product)).toEqual([
      { hue: 1, chroma: 2, luminance: 3 },
      { hue: 4, chroma: 5, luminance: 6 }
    ]);
  });

  it("supports the snake_case color_palette key", () => {
    expect(projectColorPalette({ color_palette: [{ hue: 1, chroma: 2, luminance: 3 }] })).toHaveLength(1);
  });

  it("returns undefined for empty/missing palettes", () => {
    expect(projectColorPalette({})).toBeUndefined();
    expect(projectColorPalette({ colorPalette: [] })).toBeUndefined();
    expect(projectColorPalette({ colorPalette: [{ nope: true }] })).toBeUndefined();
  });
});

describe("projectComponents", () => {
  it("keeps only fully-specified components, reading nested code objects", () => {
    const product: CatalogProduct = {
      components: [
        { categoryComponent: { code: "Base" }, materialType: { code: "Wood" }, color: { hue: 1, chroma: 2, luminance: 3 } },
        { categoryComponent: "Top", materialType: "Stone" } // no color -> dropped
      ]
    };
    expect(projectComponents(product)).toEqual([{ categoryComponent: "Base", color: { hue: 1, chroma: 2, luminance: 3 }, materialType: "Wood" }]);
  });

  it("returns undefined when nothing qualifies", () => {
    expect(projectComponents({ components: [] })).toBeUndefined();
    expect(projectComponents({})).toBeUndefined();
  });
});

describe("projectTileExtras", () => {
  it("stringifies dimensions and reads shape code objects", () => {
    expect(projectTileExtras({ shape: { code: "Hex" }, pieceLength: 12, pieceWidth: 6 })).toEqual({ shape: "Hex", pieceLength: "12", pieceWidth: "6" });
  });

  it("omits absent fields", () => {
    expect(projectTileExtras({})).toEqual({});
  });
});

describe("resolveTilePattern", () => {
  it("matches a product pattern-id key whose value equals the texture", () => {
    expect(resolveTilePattern({ herringbonePatternId: "tex-1" }, "floorTile", "tex-1", {})).toBe("Herringbone");
  });

  it("falls back to a known design pattern value", () => {
    expect(resolveTilePattern({}, "floorTile", "tex-1", { floorTilePattern: "Stacked" })).toBe("Stacked");
  });

  it("returns undefined for an unknown design pattern", () => {
    expect(resolveTilePattern({}, "floorTile", "tex-1", { floorTilePattern: "Bogus" })).toBeUndefined();
  });
});

describe("isScanLike", () => {
  it("detects scan-shaped records", () => {
    expect(isScanLike({ areas: {} })).toBe(true);
    expect(isScanLike({ niches: [] })).toBe(true);
    expect(isScanLike({ tubs: [] })).toBe(true);
    expect(isScanLike({ other: 1 })).toBe(false);
    expect(isScanLike(null)).toBe(false);
  });
});

describe("getTextureScale", () => {
  it("prefers an explicit pattern scale", () => {
    expect(getTextureScale({}, { x: 2, y: 3 })).toEqual({ x: 2, y: 3 });
  });

  it("reads textureScale object then falls back to flat X/Y fields", () => {
    expect(getTextureScale({ textureScale: { x: 1, y: 2 } })).toEqual({ x: 1, y: 2 });
    expect(getTextureScale({ textureScaleX: 4, textureScaleY: 5 })).toEqual({ x: 4, y: 5 });
  });
});

describe("getAssetId", () => {
  it("reads from renderAttributes, then top-level 3DAssetId, then assetId", () => {
    expect(getAssetId({ renderAttributes: { "3DAssetId": "a" } })).toBe("a");
    expect(getAssetId({ "3DAssetId": "b" })).toBe("b");
    expect(getAssetId({ assetId: "c" })).toBe("c");
    expect(getAssetId({})).toBeNull();
  });
});

describe("getShowers", () => {
  it("returns the showers array or an empty array", () => {
    expect(getShowers({ areas: { showers: [{ id: 1 }] } })).toEqual([{ id: 1 }]);
    expect(getShowers({ areas: {} })).toEqual([]);
    expect(getShowers({})).toEqual([]);
  });
});

describe("visibilityStyling", () => {
  it("hides only on an explicit false", () => {
    expect(visibilityStyling(false)).toBe("Hidden");
    expect(visibilityStyling(true)).toBe("Default");
    expect(visibilityStyling(undefined)).toBe("Default");
  });
});

describe("getScanContext", () => {
  it("flags showers and alcove tubs", () => {
    const scan: ScanLike = { areas: { showers: [{ id: 1 }] }, tubs: [{ type: "Alcove" }] };
    expect(getScanContext(scan)).toEqual({ hasShowerInScan: true, hasAlcoveTubInScan: true });
  });

  it("returns false flags for an empty scan", () => {
    expect(getScanContext({})).toEqual({ hasShowerInScan: false, hasAlcoveTubInScan: false });
  });
});

describe("buildSurface", () => {
  it("returns null for a null product", () => {
    expect(buildSurface(null, "floorTile", {})).toBeNull();
  });

  it("returns null when there is no texture or asset", () => {
    expect(buildSurface({ id: "p1" }, "floorTile", {})).toBeNull();
  });

  it("builds a surface from the asset id with default scale", () => {
    const surface = buildSurface({ id: "p1", renderAttributes: { "3DAssetId": "asset-1" } }, "floorTile", {});
    expect(surface).toMatchObject({ productId: "p1", texture: "asset-1", scale: { x: "1", y: "1" } });
  });

  it("adds the wallpaper placement default", () => {
    expect(buildSurface({ id: "p1", renderAttributes: { "3DAssetId": "a" } }, "wallpaper", {})?.placement).toBe("VanityWall");
  });

  it("adds wallTile placement and tile extras + pattern", () => {
    const surface = buildSurface({ id: "p1", renderAttributes: { "3DAssetId": "a" }, shape: "Square", pieceLength: 12, pieceWidth: 12 }, "wallTile", { wallTilePattern: "Stacked" });
    expect(surface).toMatchObject({ placement: "VanityHalfWall", shape: "Square", pieceLength: "12", pieceWidth: "12", pattern: "Stacked" });
  });
});

describe("buildObject", () => {
  const showerScan: ScanLike = { areas: { showers: [{ id: 1 }] } };
  const tubScan: ScanLike = { tubs: [{ type: "Alcove" }] };

  it("returns a styling-only showerGlass object when no product but shower in scan", () => {
    expect(buildObject(null, "showerGlass", {}, showerScan)).toEqual({ styling: "Default" });
    expect(buildObject(null, "showerGlass", { isShowerGlassVisible: false }, showerScan)).toEqual({ styling: "Hidden" });
  });

  it("returns a styling-only tubDoor object when no product but alcove tub in scan", () => {
    expect(buildObject(null, "tubDoor", { isTubDoorVisible: false }, tubScan)).toEqual({ styling: "Hidden" });
  });

  it("returns null when product has no asset and slot has no scan fallback", () => {
    expect(buildObject({ id: "p1" }, "toilet", {}, {})).toBeNull();
  });

  it("builds a full object with size and styling", () => {
    const obj = buildObject({ id: "p1", renderAttributes: { "3DAssetId": "a" }, length: 10, width: 20, height: 30 }, "toilet", {}, {});
    expect(obj).toMatchObject({ productId: "p1", asset: "a", size: { length: "10", width: "20", height: "30" }, styling: "Default" });
  });

  it("resolves a top-level asset id when renderAttributes lacks one", () => {
    expect(buildObject({ id: "p1", "3DAssetId": "top-asset" }, "toilet", {}, {})?.asset).toBe("top-asset");
  });

  it("adds vanity sink/counter fields", () => {
    const obj = buildObject({ id: "p1", renderAttributes: { "3DAssetId": "a" }, numberOfSinks: 2, counterHeight: 36, sinkOffset: 4 }, "vanity", {}, {});
    expect(obj).toMatchObject({ numberOfSinks: 2, counterHeight: "36", sinkOffset: "4" });
  });

  it("adds mirror placement default", () => {
    expect(buildObject({ id: "p1", renderAttributes: { "3DAssetId": "a" } }, "mirror", {}, {})?.placement).toBe("CenterOnSink");
  });

  it("adds lighting placement and rotation", () => {
    const obj = buildObject({ id: "p1", renderAttributes: { "3DAssetId": "a" }, abovePlacementDefaultRotation: 90 }, "lighting", {}, {});
    expect(obj).toMatchObject({ placement: "Above", rotation: 90 });
  });

  it("uses the side rotation for side-placed lighting", () => {
    const obj = buildObject({ id: "p1", renderAttributes: { "3DAssetId": "a" }, sidePlacementDefaultRotation: 45 }, "lighting", { lightingPlacement: "Side" }, {});
    expect(obj).toMatchObject({ placement: "Side", rotation: 45 });
  });

  it("maps tubFiller mounting position to placement", () => {
    expect(buildObject({ id: "p1", renderAttributes: { "3DAssetId": "a" }, mountingPosition: "Deck" }, "tubFiller", {}, {})?.placement).toBe("Deck");
  });

  it("marks removed products and drops productId when hidden", () => {
    expect(buildObject({ id: "p1", renderAttributes: { "3DAssetId": "a" }, isRemoved: true }, "toilet", {}, {})?.styling).toBe("Removed");
    const hidden = buildObject({ id: "p1", renderAttributes: { "3DAssetId": "a" } }, "showerGlass", { isShowerGlassVisible: false }, showerScan);
    expect(hidden?.styling).toBe("Hidden");
    expect(hidden?.productId).toBeUndefined();
  });

  it("hides a tub door with a product when isTubDoorVisible is false", () => {
    const hidden = buildObject({ id: "p1", renderAttributes: { "3DAssetId": "a" } }, "tubDoor", { isTubDoorVisible: false }, tubScan);
    expect(hidden?.styling).toBe("Hidden");
    expect(hidden?.productId).toBeUndefined();
  });
});
