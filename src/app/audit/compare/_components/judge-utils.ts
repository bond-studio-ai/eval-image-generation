import type { StrategyRunJudgeResultEntry } from "@/lib/strategy-run-judge-results";

export function orderedJudgeIds(left: StrategyRunJudgeResultEntry[], right: StrategyRunJudgeResultEntry[]): string[] {
  const byId = new Map<string, number>();
  for (const judge of left) {
    const { position, strategyJudgeId } = judge;
    if (!byId.has(strategyJudgeId) || position < byId.get(strategyJudgeId)!) byId.set(strategyJudgeId, position);
  }
  for (const judge of right) {
    const { position, strategyJudgeId } = judge;
    if (!byId.has(strategyJudgeId) || position < byId.get(strategyJudgeId)!) byId.set(strategyJudgeId, position);
  }
  return Array.from(byId.entries())
    .toSorted((a, b) => a[1] - b[1])
    .map(([id]) => id);
}
