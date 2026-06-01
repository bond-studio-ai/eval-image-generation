import { describe, expect, it } from "vitest";
import { normalizeStrategyRuns } from "@/app/strategies/[id]/runs-list-model";

describe("normalizeStrategyRuns", () => {
  it("returns an empty array for malformed input", () => {
    expect(normalizeStrategyRuns(null)).toEqual([]);
    expect(normalizeStrategyRuns({ not: "an array" })).toEqual([]);
  });

  it("normalizes a run summary into the Run shape", () => {
    const [run] = normalizeStrategyRuns([
      {
        id: "run-1",
        status: "completed",
        createdAt: "2026-01-01T00:00:00Z",
        completedAt: "2026-01-01T00:05:00Z",
        inputPresetName: "Preset A",
        lastOutputUrl: "https://cdn/out.png",
        judgeResults: null,
        stepResults: [{ id: "s1", status: "completed" }]
      }
    ]);
    expect(run).toMatchObject({
      id: "run-1",
      status: "completed",
      inputPresetName: "Preset A",
      lastOutputUrl: "https://cdn/out.png"
    });
    expect(run?.stepResults).toEqual([{ id: "s1", status: "completed" }]);
  });

  it("falls back to the first inputPresets entry for the preset name", () => {
    const [run] = normalizeStrategyRuns([{ id: "r", status: "completed", createdAt: "", judgeResults: null, inputPresets: [{ inputPresetName: "From list" }] }]);
    expect(run?.inputPresetName).toBe("From list");
  });

  it("defaults nullish judge and output fields", () => {
    const [run] = normalizeStrategyRuns([{ id: "r", status: "pending", createdAt: "", judgeResults: null }]);
    expect(run).toMatchObject({
      completedAt: null,
      inputPresetName: null,
      lastOutputUrl: null,
      judgeScore: null,
      isJudgeSelected: false
    });
    expect(run?.stepResults).toEqual([]);
  });
});
