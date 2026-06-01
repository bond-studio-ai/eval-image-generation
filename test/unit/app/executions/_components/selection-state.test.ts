import { describe, expect, it } from "vitest";
import { INITIAL_SELECTION, selectionReducer, type SelectionState } from "@/app/executions/_components/selection-state";

function state(overrides: Partial<SelectionState> = {}): SelectionState {
  return { ...INITIAL_SELECTION, ...overrides };
}

describe("selectionReducer", () => {
  it("toggles strategy / preset / benchmark ids on and off", () => {
    let next = selectionReducer(INITIAL_SELECTION, { type: "toggleStrategy", id: "s1" });
    expect(next.selectedStrategyIds).toEqual(["s1"]);
    next = selectionReducer(next, { type: "toggleStrategy", id: "s1" });
    expect(next.selectedStrategyIds).toEqual([]);

    expect(selectionReducer(INITIAL_SELECTION, { type: "togglePreset", id: "p1" }).selectedPresetIds).toEqual(["p1"]);
    expect(selectionReducer(INITIAL_SELECTION, { type: "toggleBenchmarkProject", id: "b1" }).selectedBenchmarkProjectIds).toEqual(["b1"]);
  });

  it("clears each selection bucket", () => {
    const populated = state({ selectedStrategyIds: ["s1"], selectedPresetIds: ["p1"], selectedBenchmarkProjectIds: ["b1"] });
    expect(selectionReducer(populated, { type: "clearStrategies" }).selectedStrategyIds).toEqual([]);
    expect(selectionReducer(populated, { type: "clearPresets" }).selectedPresetIds).toEqual([]);
    expect(selectionReducer(populated, { type: "clearBenchmarkProjects" }).selectedBenchmarkProjectIds).toEqual([]);
  });

  it("sets the search fields", () => {
    expect(selectionReducer(INITIAL_SELECTION, { type: "setStrategySearch", value: "foo" }).strategySearch).toBe("foo");
    expect(selectionReducer(INITIAL_SELECTION, { type: "setPresetSearch", value: "bar" }).presetSearch).toBe("bar");
  });

  it("setBenchmarkMode resets presets and seeds benchmark projects", () => {
    const next = selectionReducer(state({ selectedPresetIds: ["p1"] }), { type: "setBenchmarkMode", benchmarkMode: true, benchmarkProjectIds: ["b1", "b2"] });
    expect(next).toMatchObject({ benchmarkMode: true, selectedPresetIds: [], selectedBenchmarkProjectIds: ["b1", "b2"] });
  });

  it("openModal clears all selections and seeds the benchmark projects", () => {
    const next = selectionReducer(state({ selectedStrategyIds: ["s1"], strategySearch: "keep" }), {
      type: "openModal",
      benchmarkMode: true,
      benchmarkProjectIds: ["b1"]
    });
    expect(next).toMatchObject({ selectedStrategyIds: [], selectedPresetIds: [], selectedBenchmarkProjectIds: ["b1"], benchmarkMode: true });
    expect(next.strategySearch).toBe("keep");
  });

  it("resetAfterRun clears selections and searches while setting benchmark mode", () => {
    const next = selectionReducer(state({ selectedStrategyIds: ["s1"], strategySearch: "x", presetSearch: "y" }), { type: "resetAfterRun", benchmarkMode: false });
    expect(next).toEqual(state({ benchmarkMode: false }));
  });
});
