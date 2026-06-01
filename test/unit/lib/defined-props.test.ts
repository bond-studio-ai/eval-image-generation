import { describe, expect, it } from "vitest";
import { definedProps } from "@/lib/defined-props";

describe("definedProps", () => {
  it("removes keys whose value is undefined", () => {
    const result = definedProps({ a: 1, b: undefined, c: "x" });
    expect(result).toEqual({ a: 1, c: "x" });
    expect("b" in result).toBe(false);
  });

  it("keeps falsy-but-defined values", () => {
    expect(definedProps({ a: 0, b: "", c: false, d: null })).toEqual({ a: 0, b: "", c: false, d: null });
  });

  it("returns an empty object for an all-undefined input", () => {
    expect(definedProps({ a: undefined })).toEqual({});
  });
});
