import { describe, expect, it } from "vitest";
import { camelizeDeep, camelizeKeys, snakeToCamel } from "@/lib/casing";

describe("snakeToCamel", () => {
  it("converts snake_case tokens to camelCase", () => {
    expect(snakeToCamel("foo_bar")).toBe("fooBar");
    expect(snakeToCamel("shower_wall_tiles")).toBe("showerWallTiles");
  });

  it("is digit-aware", () => {
    expect(snakeToCamel("foo_3d")).toBe("foo3d");
  });

  it("leaves already-camel keys untouched", () => {
    expect(snakeToCamel("fooBar")).toBe("fooBar");
  });
});

describe("camelizeDeep", () => {
  it("recursively camelizes object keys, descending into arrays", () => {
    const input = { outer_key: { inner_key: [{ deep_key: 1 }] } };
    expect(camelizeDeep(input)).toEqual({ outerKey: { innerKey: [{ deepKey: 1 }] } });
  });

  it("returns primitives untouched", () => {
    expect(camelizeDeep("plain")).toBe("plain");
    expect(camelizeDeep(42)).toBe(42);
    expect(camelizeDeep(null)).toBe(null);
  });
});

describe("camelizeKeys", () => {
  it("shallow-camelizes top-level keys only", () => {
    expect(camelizeKeys({ foo_bar: { nested_key: 1 } })).toEqual({ fooBar: { nested_key: 1 } });
  });

  it("prefers an existing camelCase key when both casings are present", () => {
    const result = camelizeKeys({ fooBar: "camel", foo_bar: "snake" }) as Record<string, unknown>;
    expect(result["fooBar"]).toBe("camel");
  });

  it("returns arrays and non-objects untouched", () => {
    expect(camelizeKeys([1, 2])).toEqual([1, 2]);
    expect(camelizeKeys(null)).toBe(null);
    expect(camelizeKeys("x")).toBe("x");
  });
});
