import { describe, expect, it } from "vitest";
import { compareSortValues, getSortValue, type SortKey } from "@/components/review-results/drift-sorting-utils";
import type { CategoryLookup, DriftRow } from "@/components/review-results/types";

const lookup: CategoryLookup = { color: () => "#000", label: (c) => c.toUpperCase() };

function largeObject(): DriftRow {
  return {
    key: "vanities",
    kind: "largeObject",
    metrics: {
      category: "vanities",
      dollhousePixelCount: 500,
      samPixelCount: 480,
      iou: 0.8,
      centroidDriftPx: 12,
      centroidDriftNormalized: 0.1,
      p95SymmetricDistancePx: 30,
      p95RefToPredPx: 28,
      p95PredToRefPx: 32,
      areaRatio: 0.95,
      productMaskCoverage: { matchedPixels: 100, dollhousePixels: 120, recall: 0.83 }
    }
  };
}

function surface(): DriftRow {
  return {
    key: "wall_tiles",
    kind: "surface",
    metrics: {
      category: "wall_tiles",
      dollhousePixelCount: 900,
      samPixelCount: 880,
      iou: 0.6,
      boundaryDriftPx: 14,
      boundaryRefToPredPx: 13,
      boundaryPredToRefPx: 15,
      pixelClassAccuracy: 0.9,
      productMaskCoverage: null
    }
  };
}

function smallObject(): DriftRow {
  return {
    key: "faucets",
    kind: "smallObject",
    metrics: {
      category: "faucets",
      dollhousePixelCount: 50,
      samPixelCount: 40,
      presence: 1,
      centroidDriftPx: 5,
      centroidDriftNormalized: 0.05,
      p95DistancePx: 8,
      productMaskCoverage: { matchedPixels: 10, dollhousePixels: 12, recall: 0.83 }
    }
  };
}

describe("getSortValue", () => {
  it("resolves the category label lowercased", () => {
    expect(getSortValue(largeObject(), "category", lookup)).toBe("vanities");
  });

  it("returns coverage recall and dollhouse pixels for any row", () => {
    expect(getSortValue(largeObject(), "coverage", lookup)).toBe(0.83);
    expect(getSortValue(surface(), "coverage", lookup)).toBeNull();
    expect(getSortValue(surface(), "pixels", lookup)).toBe(900);
  });

  it("returns bucket-specific metrics and null for inapplicable columns", () => {
    expect(getSortValue(largeObject(), "areaRatio", lookup)).toBe(0.95);
    expect(getSortValue(surface(), "areaRatio", lookup)).toBeNull();

    expect(getSortValue(surface(), "boundary", lookup)).toBe(14);
    expect(getSortValue(largeObject(), "boundary", lookup)).toBeNull();

    expect(getSortValue(largeObject(), "centroid", lookup)).toBe(12);
    expect(getSortValue(surface(), "centroid", lookup)).toBeNull();

    expect(getSortValue(largeObject(), "iou", lookup)).toBe(0.8);
    expect(getSortValue(smallObject(), "iou", lookup)).toBeNull();

    expect(getSortValue(largeObject(), "p95", lookup)).toBe(30);
    expect(getSortValue(smallObject(), "p95", lookup)).toBe(8);
    expect(getSortValue(surface(), "p95", lookup)).toBeNull();

    expect(getSortValue(surface(), "pixelAccuracy", lookup)).toBe(0.9);
    expect(getSortValue(largeObject(), "pixelAccuracy", lookup)).toBeNull();

    expect(getSortValue(smallObject(), "presence", lookup)).toBe(1);
    expect(getSortValue(largeObject(), "presence", lookup)).toBeNull();
  });
});

describe("compareSortValues", () => {
  it("sorts numbers ascending and descending", () => {
    expect(compareSortValues(1, 2, "asc")).toBeLessThan(0);
    expect(compareSortValues(1, 2, "desc")).toBeGreaterThan(0);
  });

  it("sorts strings via localeCompare", () => {
    expect(compareSortValues("a", "b", "asc")).toBeLessThan(0);
  });

  it("always sinks null to the end regardless of direction", () => {
    expect(compareSortValues(null, 5, "asc")).toBe(1);
    expect(compareSortValues(5, null, "asc")).toBe(-1);
    expect(compareSortValues(null, 5, "desc")).toBe(1);
    expect(compareSortValues(null, null, "asc")).toBe(0);
  });

  it("treats every SortKey as exhaustive", () => {
    const keys: SortKey[] = ["category", "coverage", "iou", "centroid", "p95", "areaRatio", "boundary", "pixelAccuracy", "presence", "pixels"];
    expect(keys).toHaveLength(10);
  });
});
