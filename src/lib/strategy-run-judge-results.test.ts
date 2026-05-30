import { describe, expect, it } from "vitest";
import { parseStrategyRunJudgeResults } from "./strategy-run-judge-results";

describe("parseStrategyRunJudgeResults", () => {
  it("normalizes valid judge rows and coerces legacy numeric strings", () => {
    expect(
      parseStrategyRunJudgeResults([
        {
          id: "result-1",
          strategyRunId: "run-1",
          strategyJudgeId: "judge-1",
          judgeModel: "gemini",
          judgeType: "individual",
          position: "2",
          judgeScore: "87",
          candidateIndex: "1",
          executionTimeMs: "1200",
          judgeInputImages: [{ url: "https://example.com/a.png", label: "A" }]
        }
      ])
    ).toEqual([
      expect.objectContaining({
        id: "result-1",
        strategyRunId: "run-1",
        strategyJudgeId: "judge-1",
        judgeModel: "gemini",
        judgeType: "individual",
        position: 2,
        judgeScore: 87,
        candidateIndex: 1,
        executionTimeMs: 1200,
        judgeInputImages: [{ url: "https://example.com/a.png", label: "A" }]
      })
    ]);
  });

  it("drops malformed rows and defaults unknown judge type to batch", () => {
    expect(parseStrategyRunJudgeResults([null, {}, { id: "result-1", judgeType: "future" }])).toEqual([
      expect.objectContaining({
        id: "result-1",
        judgeType: "batch"
      })
    ]);
  });
});
