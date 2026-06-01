import { describe, expect, it } from "vitest";
import { CONDITIONAL_OPTIONS, DOLLHOUSE_ATTRIBUTES, dollhouseReferencePath, REFERENCE_OPTIONS, toDollhousePathKey } from "@/lib/prompt-template-constants";

describe("toDollhousePathKey", () => {
  it("returns an empty string for blank input", () => {
    expect(toDollhousePathKey("   ")).toBe("");
  });

  it("keeps already-camelCase keys", () => {
    expect(toDollhousePathKey("wallTile")).toBe("wallTile");
  });

  it("lowercases the leading character of PascalCase", () => {
    expect(toDollhousePathKey("WallPaint")).toBe("wallPaint");
  });

  it("camelizes space/punctuation-delimited words", () => {
    expect(toDollhousePathKey("shower wall tile")).toBe("showerWallTile");
    expect(toDollhousePathKey("Towel-Bar")).toBe("towelBar");
  });
});

describe("dollhouseReferencePath", () => {
  it("builds a handlebars path from the attribute builder", () => {
    const quantity = DOLLHOUSE_ATTRIBUTES.find((attr) => attr.value === "quantity");
    expect(quantity).toBeDefined();
    expect(dollhouseReferencePath("vanity", quantity!)).toBe("{{dollhouse.vanity.quantity}}");
  });
});

describe("option tables", () => {
  it("exposes product reference options with singular camel keys", () => {
    const faucet = REFERENCE_OPTIONS.find((opt) => opt.value === "faucets");
    expect(faucet).toMatchObject({ singular: "faucet", label: "Faucet" });
  });

  it("includes product, scene, and design conditional options", () => {
    expect(CONDITIONAL_OPTIONS.some((opt) => opt.isProduct)).toBe(true);
    expect(CONDITIONAL_OPTIONS.some((opt) => opt.value.startsWith("design."))).toBe(true);
    expect(CONDITIONAL_OPTIONS.some((opt) => opt.value === "dollhouseView")).toBe(true);
  });
});
