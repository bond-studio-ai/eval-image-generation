import { describe, expect, it } from "vitest";
import type { SegmentationCategoryMetadata } from "@/lib/segmentation-categories";
import { buildRows } from "@/components/review-results/category-rows";
import type { CategoryLookup } from "@/components/review-results/types";

const lookup: CategoryLookup = {
  label: (key) => key,
  color: (key) => `color-${key}`
};

describe("buildRows", () => {
  it("returns [] for a null record", () => {
    expect(buildRows(null, lookup)).toEqual([]);
  });

  it("builds legacy per-category rows, excluding metadata keys and sorting by label", () => {
    const rows = buildRows(
      {
        id: "r1",
        createdAt: "2026-01-01",
        wallTiles: { masks: [{ url: "w.png" }], scores: [0.9] },
        floorTiles: { image: "f.png", masks: [], scores: [] }
      },
      lookup
    );
    expect(rows.map((row) => row.category)).toEqual(["floorTiles", "wallTiles"]);
    const wall = rows.find((row) => row.category === "wallTiles");
    expect(wall?.masks).toEqual([{ url: "w.png", score: 0.9 }]);
    expect(wall?.topScore).toBe(0.9);
    expect(wall?.color).toBe("color-wallTiles");
  });

  it("derives a composite from the image when no masks are present", () => {
    const rows = buildRows({ floorTiles: { image: "f.png", masks: [] } }, lookup);
    expect(rows[0]?.composite).toBe("f.png");
  });

  it("builds concept-group rows with prompt slug and group metadata", () => {
    const metadata: SegmentationCategoryMetadata[] = [
      {
        key: "wall_tiles",
        label: "Wall Tiles",
        color: "#fff",
        samPrompt: "Wall",
        isExtra: false,
        group: "wall",
        groupPrompts: [],
        resolvedPromptSlugs: ["wall_tiles"],
        resolutionKind: "union"
      }
    ];
    const rows = buildRows({ conceptGroupResults: { wall: { wallTiles: { masks: [{ url: "w.png" }], scores: [0.5] } } } }, lookup, metadata);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ category: "wall_tiles", group: "wall", promptSlug: "wallTiles", promptLabel: "Wall" });
    expect(rows[0]?.masks).toEqual([{ url: "w.png", score: 0.5 }]);
  });
});
