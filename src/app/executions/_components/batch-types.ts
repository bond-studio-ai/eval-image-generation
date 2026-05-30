export interface RunRow {
  id: string;
  batchRunId: string | null;
  strategyId: string;
  strategyName: string | null;
  runHref?: string | null;
  status: string;
  createdAt: string;
  completedAt: string | null;
  inputPresetName: string | null;
  source: string | null;
  lastOutputUrl: string | null;
  lastOutputGenerationId: string | null;
  stepResults: { id: string; status: string }[];
  totalGenerations: number;
  ratedGenerations: number;
  judgeScore: number | null;
  isJudgeSelected: boolean;
  judgeReasoning: string | null;
  judgeOutput: string | null;
  judgeSystemPrompt: string | null;
  judgeUserPrompt: string | null;
  judgeTypeUsed: string | null;
}

export interface BatchRow {
  id: string;
  name?: string | null;
  strategyId: string | null;
  strategies: { id: string; name: string }[];
  numberOfImages: number;
  createdAt: string;
  status: string;
  totalRuns: number;
  completedRuns: number;
  failedRuns: number;
  runs: RunRow[];
}

/**
 * List-fetch / pagination state machine for `BatchRunsTab`. Grouped into a
 * reducer because `fetchBatches` mutates this whole cluster together and relies on
 * functional updates (`setBatches(prev => ...)`, `setHasMore(more => ...)`); the
 * `mergeFirstPage` action reproduces that merge byte-for-byte from current state.
 */
export interface FetchState {
  batches: BatchRow[];
  page: number;
  hasMore: boolean;
  loading: boolean;
  loadingMore: boolean;
  fetchError: string | null;
  refreshing: boolean;
}

export function deriveRunReviewStatus(run: RunRow): string {
  if (run.status === 'running' || run.status === 'pending') return 'running';
  if (run.totalGenerations === 0) return 'pending';
  if (run.ratedGenerations === 0) return 'pending';
  if (run.ratedGenerations >= run.totalGenerations) return 'reviewed';
  return 'in_progress';
}

const JUDGE_TIMEOUT_MS = 5 * 60 * 1000;

export function isAwaitingJudgeBatch(runs: RunRow[], numberOfImages: number): boolean {
  if (numberOfImages <= 1 || runs.length < 2) return false;
  const allDone = runs.every((r) => r.status === 'completed' || r.status === 'failed');
  if (!allDone) return false;
  const withOutput = runs.filter((r) => r.lastOutputUrl);
  if (withOutput.length < 2 || !runs.every((r) => r.judgeScore == null)) return false;

  const completedTimes = runs.flatMap((r) =>
    r.completedAt ? [new Date(r.completedAt).getTime()] : [],
  );
  if (completedTimes.length === 0) return false;
  return Date.now() - Math.max(...completedTimes) < JUDGE_TIMEOUT_MS;
}
