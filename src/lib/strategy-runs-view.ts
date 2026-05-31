export interface StrategyRunViewInput {
  id: string;
  status: string;
  createdAt: string;
  lastOutputUrl?: string | null;
  batchRunId?: string | null;
  groupId?: string | null;
  judgeScore?: number | null;
}

export interface StrategyRunBatchGroup<T extends StrategyRunViewInput> {
  kind: "batch";
  id: string;
  runs: T[];
  status: string;
  createdAt: string;
  awaitingJudge: boolean;
  isStandalone: boolean;
}

export function isAwaitingJudge<T extends StrategyRunViewInput>(batchRuns: T[], hasJudge?: boolean): boolean {
  if (!hasJudge || batchRuns.length < 2) return false;
  const allDone = batchRuns.every((run) => run.status === "completed" || run.status === "failed");
  if (!allDone) return false;
  const hasOutputs = batchRuns.filter((run) => run.lastOutputUrl).length >= 2;
  return hasOutputs && batchRuns.every((run) => run.judgeScore == null);
}

export function deriveBatchStatus<T extends StrategyRunViewInput>(runs: T[]): string {
  const statuses = runs.map((run) => run.status);
  if (statuses.every((status) => status === "completed")) return "completed";
  if (statuses.some((status) => status === "running" || status === "pending")) return "running";
  if (statuses.includes("failed")) return "failed";
  return "pending";
}

export function groupStrategyRuns<T extends StrategyRunViewInput>(runs: T[], hasJudge?: boolean): StrategyRunBatchGroup<T>[] {
  const batchGroups = new Map<string, T[]>();
  const standaloneKeys = new Set<string>();

  for (const run of runs) {
    const realKey = run.groupId ?? run.batchRunId;
    const runGroupId = realKey ?? run.id;
    if (!realKey) standaloneKeys.add(runGroupId);
    if (!batchGroups.has(runGroupId)) batchGroups.set(runGroupId, []);
    batchGroups.get(runGroupId)!.push(run);
  }

  const items: StrategyRunBatchGroup<T>[] = [];
  for (const [batchId, batchRuns] of batchGroups) {
    const sorted = batchRuns.toSorted((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    items.push({
      kind: "batch",
      id: batchId,
      runs: sorted,
      status: deriveBatchStatus(sorted),
      createdAt: sorted[0]?.createdAt ?? "",
      awaitingJudge: isAwaitingJudge(sorted, hasJudge),
      isStandalone: standaloneKeys.has(batchId)
    });
  }

  return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
