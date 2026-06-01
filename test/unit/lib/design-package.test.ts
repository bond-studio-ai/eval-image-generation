import { describe, expect, it } from "vitest";
import { designSettingsFromPackage, isPowderRoomLayoutName } from "@/lib/design-package";

describe("isPowderRoomLayoutName", () => {
  it("matches powder room names case-insensitively", () => {
    expect(isPowderRoomLayoutName("Small Powder Room")).toBe(true);
    expect(isPowderRoomLayoutName("POWDER ROOM A")).toBe(true);
  });

  it("returns false for other names and nullish input", () => {
    expect(isPowderRoomLayoutName("Primary Bath")).toBe(false);
    expect(isPowderRoomLayoutName(null)).toBe(false);
    expect(isPowderRoomLayoutName(undefined)).toBe(false);
  });
});

describe("designSettingsFromPackage", () => {
  it("returns null for nullish input", () => {
    expect(designSettingsFromPackage(null)).toBeNull();
    expect(designSettingsFromPackage(undefined)).toBeNull();
  });

  it("extracts known design fields from materials", () => {
    const result = designSettingsFromPackage({
      id: "pkg1",
      materials: { paint: "white", isShowerGlassVisible: true, ignored: "x" }
    });
    expect(result).toMatchObject({ paint: "white", isShowerGlassVisible: true });
    expect(result).not.toHaveProperty("ignored");
  });

  it("selects the largest vanity size for non-powder rooms", () => {
    const result = designSettingsFromPackage({
      id: "pkg1",
      vanityDict: { "30": "v30", "48": "v48" },
      faucetDict: { "30": "f30", "48": "f48" }
    });
    expect(result).toMatchObject({ vanity: "v48", faucet: "f48" });
  });

  it("selects the smallest vanity size for powder rooms", () => {
    const result = designSettingsFromPackage({ id: "pkg1", vanityDict: { "30": "v30", "48": "v48" } }, { isPowderRoom: true });
    expect(result).toMatchObject({ vanity: "v30" });
  });

  it("returns null when nothing usable is present", () => {
    expect(designSettingsFromPackage({ id: "pkg1" })).toBeNull();
  });
});
