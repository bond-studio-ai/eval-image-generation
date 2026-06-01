import { describe, expect, it } from "vitest";
import {
  type AnalyticsComparisonColumn,
  buildComparisonSlices,
  createEmptyComparisonColumn,
  encodeComparisonColumn,
  formatComparisonRange,
  formatComparisonSource,
  getParamValues,
  parseComparisonState
} from "@/app/analytics/comparison-utils";

describe("getParamValues", () => {
  it("reads all values from a URLSearchParams", () => {
    const params = new URLSearchParams("k=a&k=b&other=c");
    expect(getParamValues(params, "k")).toEqual(["a", "b"]);
    expect(getParamValues(params, "missing")).toEqual([]);
  });

  it("normalizes a record of string | string[] | undefined", () => {
    expect(getParamValues({ k: "a" }, "k")).toEqual(["a"]);
    expect(getParamValues({ k: ["a", "b"] }, "k")).toEqual(["a", "b"]);
    expect(getParamValues({ k: undefined }, "k")).toEqual([]);
  });

  it("filters non-string entries out of an array", () => {
    expect(getParamValues({ k: ["a", undefined as unknown as string] }, "k")).toEqual(["a"]);
  });
});

describe("parseComparisonState", () => {
  it("parses encoded columns and the enabled flag", () => {
    const params = new URLSearchParams();
    params.set("compare", "1");
    params.append("compareColumn", "2026-01-01|2026-02-01|s1|preset|col-1");
    const state = parseComparisonState(params);
    expect(state.enabled).toBe(true);
    expect(state.columns).toEqual([{ id: "col-1", from: "2026-01-01", to: "2026-02-01", strategyId: "s1", source: "preset" }]);
  });

  it("backfills a missing column id from legacy URLs", () => {
    const params = new URLSearchParams();
    params.append("compareColumn", "2026-01-01|2026-02-01|s1|benchmark");
    const [column] = parseComparisonState(params).columns;
    expect(column?.id).toBeTruthy();
    expect(column?.source).toBe("benchmark");
  });

  it("drops columns with an invalid source", () => {
    const params = new URLSearchParams();
    params.append("compareColumn", "a|b|s1|not-a-source|id");
    expect(parseComparisonState(params).columns).toEqual([]);
  });

  it("expands the legacy range x strategy x source cartesian product when no columns are present", () => {
    const params = new URLSearchParams();
    params.append("compareRange", "2026-01-01:2026-02-01");
    params.append("compareStrategy", "s1");
    params.append("compareStrategy", "s2");
    params.append("compareSource", "preset");
    const state = parseComparisonState(params);
    expect(state.columns).toHaveLength(2);
    expect(state.columns.map((c) => c.strategyId)).toEqual(["s1", "s2"]);
    expect(state.columns.every((c) => c.from === "2026-01-01" && c.to === "2026-02-01")).toBe(true);
  });
});

describe("encodeComparisonColumn", () => {
  it("round-trips through parseComparisonState", () => {
    const column: AnalyticsComparisonColumn = { id: "x", from: "2026-01-01", to: "2026-02-01", strategyId: "s1", source: "raw_input" };
    const params = new URLSearchParams();
    params.append("compareColumn", encodeComparisonColumn(column));
    expect(parseComparisonState(params).columns[0]).toEqual(column);
  });
});

describe("formatComparisonSource", () => {
  it("maps each source to a label", () => {
    expect(formatComparisonSource("raw_input")).toBe("Raw input");
    expect(formatComparisonSource("benchmark")).toBe("Benchmark");
    expect(formatComparisonSource("preset")).toBe("Preset");
  });
});

describe("formatComparisonRange", () => {
  it("formats a full range", () => {
    expect(formatComparisonRange({ from: "2026-01-01", to: "2026-01-31" })).toBe("Jan 1 - Jan 31");
  });

  it("handles partial and empty ranges", () => {
    expect(formatComparisonRange({ from: "2026-01-01", to: "" })).toBe("From 2026-01-01");
    expect(formatComparisonRange({ from: "", to: "2026-01-31" })).toBe("Until 2026-01-31");
    expect(formatComparisonRange({ from: "", to: "" })).toBe("Select date range");
  });
});

describe("createEmptyComparisonColumn", () => {
  it("creates a fresh column with a generated id", () => {
    const column = createEmptyComparisonColumn();
    expect(column.id).toBeTruthy();
    expect(column).toMatchObject({ from: "", to: "", strategyId: "", source: "preset" });
  });

  it("applies provided defaults", () => {
    expect(createEmptyComparisonColumn({ from: "2026-01-01", source: "benchmark" })).toMatchObject({ from: "2026-01-01", source: "benchmark" });
  });
});

describe("buildComparisonSlices", () => {
  const strategies = [{ id: "s1", name: "Strategy One" }];

  it("builds a slice for each complete column with a known strategy", () => {
    const slices = buildComparisonSlices({ enabled: true, columns: [{ id: "c1", from: "2026-01-01", to: "2026-01-31", strategyId: "s1", source: "preset" }] }, strategies);
    expect(slices).toHaveLength(1);
    expect(slices[0]).toMatchObject({ strategyId: "s1", strategyName: "Strategy One", source: "preset" });
    expect(slices[0]?.label).toBe("Preset | Jan 1 - Jan 31");
  });

  it("skips incomplete columns and unknown strategies", () => {
    const slices = buildComparisonSlices(
      {
        enabled: true,
        columns: [
          { id: "c1", from: "", to: "2026-01-31", strategyId: "s1", source: "preset" },
          { id: "c2", from: "2026-01-01", to: "2026-01-31", strategyId: "unknown", source: "preset" }
        ]
      },
      strategies
    );
    expect(slices).toEqual([]);
  });
});
