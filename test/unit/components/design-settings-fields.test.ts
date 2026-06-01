import { describe, expect, it } from "vitest";
import { getProductImageTypeKey, readProductImageType } from "@/components/design-settings-fields";

describe("getProductImageTypeKey", () => {
  it("appends the ImageType suffix", () => {
    expect(getProductImageTypeKey("vanity")).toBe("vanityImageType");
    expect(getProductImageTypeKey("floorTile")).toBe("floorTileImageType");
  });
});

describe("readProductImageType", () => {
  it("accepts the known image types", () => {
    expect(readProductImageType("featured-image")).toBe("featured-image");
    expect(readProductImageType("line-drawing")).toBe("line-drawing");
    expect(readProductImageType("tear-sheet")).toBe("tear-sheet");
    expect(readProductImageType("arbitrary")).toBe("arbitrary");
  });

  it("returns null for unknown values", () => {
    expect(readProductImageType("photo-image")).toBeNull();
    expect(readProductImageType(42)).toBeNull();
    expect(readProductImageType(null)).toBeNull();
  });
});
