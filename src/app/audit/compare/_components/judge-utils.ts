import type { StrategyRunJudgeResultEntry } from "@/lib/strategy-run-judge-results";

export function orderedJudgeIds(left: StrategyRunJudgeResultEntry[], right: StrategyRunJudgeResultEntry[]): string[] {
  const byId = new Map<string, number>();
  for (const judge of left) {
    const position = judge.position;
    if (!byId.has(judge.strategyJudgeId) || position < byId.get(judge.strategyJudgeId)!) byId.set(judge.strategyJudgeId, position);
  }
  for (const judge of right) {
    const position = judge.position;
    if (!byId.has(judge.strategyJudgeId) || position < byId.get(judge.strategyJudgeId)!) byId.set(judge.strategyJudgeId, position);
  }
  return Array.from(byId.entries())
    .toSorted((a, b) => a[1] - b[1])
    .map(([id]) => id);
}
