import { describe, expect, it } from "vitest";
import { orderedJudgeIds } from "@/app/audit/compare/_components/judge-utils";
import { parseStrategyRunJudgeResults, type StrategyRunJudgeResultEntry } from "@/lib/strategy-run-judge-results";

function entry(id: string, strategyJudgeId: string, position: number): StrategyRunJudgeResultEntry {
  return parseStrategyRunJudgeResults([{ id, strategyJudgeId, position }])[0]!;
}

describe("orderedJudgeIds", () => {
  it("merges judge ids from both sides ordered by position", () => {
    const left = [entry("a", "j2", 2), entry("b", "j1", 1)];
    const right = [entry("c", "j3", 3)];
    expect(orderedJudgeIds(left, right)).toEqual(["j1", "j2", "j3"]);
  });

  it("dedupes shared judges, keeping the lowest position", () => {
    const left = [entry("a", "j1", 5)];
    const right = [entry("b", "j1", 2)];
    expect(orderedJudgeIds(left, right)).toEqual(["j1"]);
  });

  it("returns an empty list when neither side has judges", () => {
    expect(orderedJudgeIds([], [])).toEqual([]);
  });
});
