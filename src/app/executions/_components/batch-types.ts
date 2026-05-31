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

export function deriveRunReviewStatus(run: RunRow): string {
  if (run.status === "running" || run.status === "pending") return "running";
  if (run.totalGenerations === 0) return "pending";
  if (run.ratedGenerations === 0) return "pending";
  if (run.ratedGenerations >= run.totalGenerations) return "reviewed";
  return "in_progress";
}

const JUDGE_TIMEOUT_MINUTES = 5;
const SECONDS_PER_MINUTE = 60;
const MS_PER_SECOND = 1000;
const JUDGE_TIMEOUT_MS = JUDGE_TIMEOUT_MINUTES * SECONDS_PER_MINUTE * MS_PER_SECOND;
/** A judged batch needs at least two candidate outputs to compare. */
const MIN_JUDGED_BATCH_SIZE = 2;

export function isAwaitingJudgeBatch(runs: RunRow[], numberOfImages: number): boolean {
  if (numberOfImages <= 1 || runs.length < MIN_JUDGED_BATCH_SIZE) return false;
  const allDone = runs.every((run) => run.status === "completed" || run.status === "failed");
  if (!allDone) return false;
  const withOutput = runs.filter((run) => run.lastOutputUrl);
  if (withOutput.length < MIN_JUDGED_BATCH_SIZE || !runs.every((run) => run.judgeScore == null)) return false;

  const completedTimes = runs.flatMap((run) => (run.completedAt ? [new Date(run.completedAt).getTime()] : []));
  if (completedTimes.length === 0) return false;
  return Date.now() - Math.max(...completedTimes) < JUDGE_TIMEOUT_MS;
}
