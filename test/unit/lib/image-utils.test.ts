import { describe, expect, it } from "vitest";
import { toUrlArray, withImageParams } from "@/lib/image-utils";

describe("withImageParams", () => {
  it("appends CDN params with ? when no query exists", () => {
    expect(withImageParams("https://cdn.test/a.png")).toBe("https://cdn.test/a.png?w=256&f=webp");
  });

  it("appends CDN params with & when a query already exists", () => {
    expect(withImageParams("https://cdn.test/a.png?v=1", 512)).toBe("https://cdn.test/a.png?v=1&w=512&f=webp");
  });

  it("honors a custom width", () => {
    expect(withImageParams("https://cdn.test/a.png", 128)).toContain("w=128");
  });

  it("leaves data URLs and empty strings untouched", () => {
    expect(withImageParams("data:image/png;base64,xxx")).toBe("data:image/png;base64,xxx");
    expect(withImageParams("")).toBe("");
  });
});

describe("toUrlArray", () => {
  it("filters an array to non-empty strings", () => {
    expect(toUrlArray(["a", "", "b", 1, null])).toEqual(["a", "b"]);
  });

  it("wraps a single non-empty string", () => {
    expect(toUrlArray("solo")).toEqual(["solo"]);
  });

  it("returns an empty array for empty/invalid input", () => {
    expect(toUrlArray("")).toEqual([]);
    expect(toUrlArray(null)).toEqual([]);
    expect(toUrlArray(undefined)).toEqual([]);
    expect(toUrlArray(42)).toEqual([]);
  });
});
