import { describe, expect, it } from "vitest";
import { defaultStepLabel, formatCategoryName, formatExecMs, normalizeCategoryRows, normalizeIssueItems, normalizeStepPerformanceRows, normalizeSummary } from "@/app/analytics/_comparison-spreadsheet/helpers";

describe("formatCategoryName", () => {
  it("splits camelCase, replaces underscores, and title-cases", () => {
    expect(formatCategoryName("sceneAccuracy")).toBe("Scene Accuracy");
    expect(formatCategoryName("shower_wall_tiles")).toBe("Shower Wall Tiles");
  });
});

describe("normalizeCategoryRows", () => {
  it("returns an empty array for non-array input", () => {
    expect(normalizeCategoryRows(null)).toEqual([]);
    expect(normalizeCategoryRows({})).toEqual([]);
  });

  it("coerces numbers and string names with safe defaults", () => {
    const [row] = normalizeCategoryRows([{ name: "Lighting", total: "10", success: 7, successPct: 0.7 }]);
    expect(row).toMatchObject({ name: "Lighting", total: 10, success: 7, failure: 0, successPct: 0.7 });
  });

  it("filters issues without an issue label", () => {
    const [row] = normalizeCategoryRows([{ name: "X", issues: [{ issue: "blurry", count: 3 }, { count: 1 }] }]);
    expect(row?.issues).toEqual([{ issue: "blurry", count: 3 }]);
  });

  it("defaults issues to an empty array when not an array", () => {
    const [row] = normalizeCategoryRows([{ name: "X", issues: "nope" }]);
    expect(row?.issues).toEqual([]);
  });
});

describe("normalizeIssueItems", () => {
  it("keeps only items with a non-empty issue", () => {
    expect(normalizeIssueItems([{ issue: "a", count: 2 }, { issue: "", count: 1 }, {}])).toEqual([{ issue: "a", count: 2 }]);
  });

  it("returns [] for non-array input", () => {
    expect(normalizeIssueItems(undefined)).toEqual([]);
  });
});

describe("normalizeStepPerformanceRows", () => {
  it("drops rows without a stepId and sorts by stepOrder", () => {
    const rows = normalizeStepPerformanceRows([{ stepId: "b", stepOrder: 2, type: "judge" }, { stepOrder: 5 }, { stepId: "a", stepOrder: 1 }]);
    expect(rows.map((r) => r.stepId)).toEqual(["a", "b"]);
  });

  it("nulls missing exec-time fields and defaults type to generation", () => {
    const [row] = normalizeStepPerformanceRows([{ stepId: "a", avgExecTimeMs: null }]);
    expect(row).toMatchObject({ type: "generation", avgExecTimeMs: null, name: null, model: null });
  });
});

describe("formatExecMs", () => {
  it("renders the em-dash sentinel for null/NaN", () => {
    expect(formatExecMs(null)).toBe("-");
    expect(formatExecMs(Number.NaN)).toBe("-");
  });

  it("formats sub-second values in ms", () => {
    expect(formatExecMs(250)).toBe("250 ms");
  });

  it("formats seconds with precision below 10s and one decimal above", () => {
    expect(formatExecMs(2500)).toBe("2.50 s");
    expect(formatExecMs(25_000)).toBe("25.0 s");
  });

  it("formats minutes and remainder seconds", () => {
    expect(formatExecMs(90_000)).toBe("1m 30s");
  });
});

describe("defaultStepLabel", () => {
  const base = { stepId: "s", stepOrder: 3, name: null, type: "generation", model: null, sampleCount: 0, avgExecTimeMs: null, minExecTimeMs: null, maxExecTimeMs: null };

  it("prefers a trimmed name", () => {
    expect(defaultStepLabel({ ...base, name: "  Render  " })).toBe("  Render  ");
  });

  it("labels judge steps", () => {
    expect(defaultStepLabel({ ...base, type: "judge" })).toBe("Judge");
  });

  it("falls back to the step order", () => {
    expect(defaultStepLabel(base)).toBe("Step 3");
  });
});

describe("normalizeSummary", () => {
  it("returns null for non-object input", () => {
    expect(normalizeSummary(null)).toBeNull();
    expect(normalizeSummary("x")).toBeNull();
  });

  it("coerces all numeric fields", () => {
    expect(normalizeSummary({ sceneRatedCount: "4", sceneGoodPct: 0.5 })).toMatchObject({ sceneRatedCount: 4, sceneGoodPct: 0.5, productRatedCount: 0 });
  });
});
