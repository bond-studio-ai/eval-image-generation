import { describe, expect, it } from "vitest";
import { designSettingsHasValues, isNonEmpty } from "@/components/design-settings-values";

describe("isNonEmpty", () => {
  it("treats nullish as empty", () => {
    expect(isNonEmpty(null)).toBe(false);
    expect(isNonEmpty(undefined)).toBe(false);
  });

  it("treats non-empty strings as present and empty strings as empty", () => {
    expect(isNonEmpty("x")).toBe(true);
    expect(isNonEmpty("")).toBe(false);
  });

  it("treats any boolean as present", () => {
    expect(isNonEmpty(true)).toBe(true);
    expect(isNonEmpty(false)).toBe(true);
  });

  it("treats other types as empty", () => {
    expect(isNonEmpty(42)).toBe(false);
    expect(isNonEmpty({})).toBe(false);
  });
});

describe("designSettingsHasValues", () => {
  it("returns false for a null value", () => {
    expect(designSettingsHasValues(null)).toBe(false);
  });

  it("returns true when any field is non-empty", () => {
    expect(designSettingsHasValues({ vanity: "v1", mirror: "" })).toBe(true);
  });

  it("returns false when every field is empty", () => {
    expect(designSettingsHasValues({ vanity: "", mirror: null })).toBe(false);
  });
});
