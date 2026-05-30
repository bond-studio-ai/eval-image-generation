import type { StrategyRunJudgeResultEntry } from '@/lib/strategy-run-judge-results';

export function orderedJudgeIds(
  left: StrategyRunJudgeResultEntry[],
  right: StrategyRunJudgeResultEntry[],
): string[] {
  const byId = new Map<string, number>();
  for (const j of left) {
    const p = j.position;
    if (!byId.has(j.strategyJudgeId) || p < byId.get(j.strategyJudgeId)!)
      byId.set(j.strategyJudgeId, p);
  }
  for (const j of right) {
    const p = j.position;
    if (!byId.has(j.strategyJudgeId) || p < byId.get(j.strategyJudgeId)!)
      byId.set(j.strategyJudgeId, p);
  }
  return [...byId.entries()].toSorted((a, b) => a[1] - b[1]).map(([id]) => id);
}
