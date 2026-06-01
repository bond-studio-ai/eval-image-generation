import { describe, expect, it } from "vitest";
import { indexByKey, type SegmentationCategoryMetadata } from "@/lib/segmentation-categories";

function category(key: string): SegmentationCategoryMetadata {
  return {
    key,
    label: key,
    color: "#000000",
    samPrompt: key,
    isExtra: false,
    group: key,
    groupPrompts: [],
    resolvedPromptSlugs: [key],
    resolutionKind: "union"
  };
}

describe("indexByKey", () => {
  it("registers the snake_case key and its camelCase alias", () => {
    const map = indexByKey([category("shower_wall_tiles")]);
    expect(map.get("shower_wall_tiles")?.key).toBe("shower_wall_tiles");
    expect(map.get("showerWallTiles")?.key).toBe("shower_wall_tiles");
  });

  it("registers a single entry when the key has no snake parts", () => {
    const map = indexByKey([category("toilets")]);
    expect(map.size).toBe(1);
    expect(map.get("toilets")?.key).toBe("toilets");
  });
});
