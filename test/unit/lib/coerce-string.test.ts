import { describe, expect, it } from "vitest";
import { coerceString } from "@/lib/coerce-string";

describe("coerceString", () => {
  it("returns strings as-is", () => {
    expect(coerceString("hello")).toBe("hello");
    expect(coerceString("")).toBe("");
  });

  it("stringifies numbers, booleans, and bigints", () => {
    expect(coerceString(42)).toBe("42");
    expect(coerceString(true)).toBe("true");
    expect(coerceString(10n)).toBe("10");
  });

  it("returns undefined for objects, arrays, null, and undefined", () => {
    expect(coerceString({})).toBeUndefined();
    expect(coerceString([1, 2])).toBeUndefined();
    expect(coerceString(null)).toBeUndefined();
    expect(coerceString(undefined)).toBeUndefined();
  });
});
