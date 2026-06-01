import { describe, expect, it } from "vitest";
import { deriveRunReviewStatus, isAwaitingJudgeBatch, type RunRow } from "@/app/executions/_components/batch-types";

function run(overrides: Partial<RunRow> = {}): RunRow {
  return {
    id: "r1",
    batchRunId: null,
    strategyId: "s1",
    strategyName: null,
    status: "completed",
    createdAt: "2026-01-01T00:00:00Z",
    completedAt: new Date().toISOString(),
    inputPresetName: null,
    source: null,
    lastOutputUrl: "https://cdn/out.png",
    lastOutputGenerationId: "g1",
    stepResults: [],
    totalGenerations: 4,
    ratedGenerations: 0,
    judgeScore: null,
    isJudgeSelected: false,
    judgeReasoning: null,
    judgeOutput: null,
    judgeSystemPrompt: null,
    judgeUserPrompt: null,
    judgeTypeUsed: null,
    ...overrides
  };
}

describe("deriveRunReviewStatus", () => {
  it("reports running for running/pending statuses", () => {
    expect(deriveRunReviewStatus(run({ status: "running" }))).toBe("running");
    expect(deriveRunReviewStatus(run({ status: "pending" }))).toBe("running");
  });

  it("reports pending when nothing is generated or rated", () => {
    expect(deriveRunReviewStatus(run({ totalGenerations: 0 }))).toBe("pending");
    expect(deriveRunReviewStatus(run({ totalGenerations: 4, ratedGenerations: 0 }))).toBe("pending");
  });

  it("reports in_progress and reviewed based on rated coverage", () => {
    expect(deriveRunReviewStatus(run({ totalGenerations: 4, ratedGenerations: 2 }))).toBe("in_progress");
    expect(deriveRunReviewStatus(run({ totalGenerations: 4, ratedGenerations: 4 }))).toBe("reviewed");
  });
});

describe("isAwaitingJudgeBatch", () => {
  it("returns false for single-image runs or too-small batches", () => {
    expect(isAwaitingJudgeBatch([run(), run()], 1)).toBe(false);
    expect(isAwaitingJudgeBatch([run()], 4)).toBe(false);
  });

  it("returns true when a completed multi-output batch has no judge scores yet", () => {
    const runs = [run(), run({ id: "r2" })];
    expect(isAwaitingJudgeBatch(runs, 4)).toBe(true);
  });

  it("returns false once a judge score lands", () => {
    const runs = [run({ judgeScore: 80 }), run({ id: "r2" })];
    expect(isAwaitingJudgeBatch(runs, 4)).toBe(false);
  });

  it("returns false when runs are not all done", () => {
    const runs = [run({ status: "running" }), run({ id: "r2" })];
    expect(isAwaitingJudgeBatch(runs, 4)).toBe(false);
  });

  it("returns false when the most recent completion is older than the judge timeout", () => {
    const old = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const runs = [run({ completedAt: old }), run({ id: "r2", completedAt: old })];
    expect(isAwaitingJudgeBatch(runs, 4)).toBe(false);
  });
});
