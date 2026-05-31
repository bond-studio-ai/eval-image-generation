import { parseOrFallback } from "@/lib/api/parse";
import { type StrategyRunSummary, strategyRunSummaryArraySchema } from "@/lib/api/schemas";
import { parseStrategyRunJudgeResults, type StrategyRunJudgeResultEntry } from "@/lib/strategy-run-judge-results";
import type { StrategyRunBatchGroup } from "@/lib/strategy-runs-view";

export interface StepResult {
  id: string;
  status: string;
}

export interface Run {
  id: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
  inputPresetName: string | null;
  lastOutputUrl?: string | null;
  lastOutputGenerationId?: string | null;
  batchRunId?: string | null;
  groupId?: string | null;
  stepResults: StepResult[];
  judgeScore?: number | null;
  isJudgeSelected?: boolean;
  judgeReasoning?: string | null;
  judgeOutput?: string | null;
  judgeSystemPrompt?: string | null;
  judgeUserPrompt?: string | null;
  judgeTypeUsed?: string | null;
  judgeResults?: StrategyRunJudgeResultEntry[] | null;
}

export type ListItem = StrategyRunBatchGroup<Run>;

/**
 * Map one schema-validated run summary into the `Run` shape the UI consumes.
 * `judgeResults` is the one field the schema leaves `unknown`, so it's
 * normalized here through the domain parser.
 */
function toRun(summary: StrategyRunSummary): Run {
  return {
    id: summary.id,
    status: summary.status,
    createdAt: summary.createdAt,
    completedAt: summary.completedAt ?? null,
    inputPresetName: summary.inputPresetName ?? summary.inputPresets?.[0]?.inputPresetName ?? null,
    lastOutputUrl: summary.lastOutputUrl ?? null,
    lastOutputGenerationId: summary.lastOutputGenerationId ?? null,
    batchRunId: summary.batchRunId ?? null,
    groupId: summary.groupId ?? null,
    judgeScore: summary.judgeScore ?? null,
    isJudgeSelected: summary.isJudgeSelected ?? false,
    judgeReasoning: summary.judgeReasoning ?? null,
    judgeOutput: summary.judgeOutput ?? null,
    judgeSystemPrompt: summary.judgeSystemPrompt ?? null,
    judgeUserPrompt: summary.judgeUserPrompt ?? null,
    judgeTypeUsed: summary.judgeTypeUsed ?? null,
    judgeResults: parseStrategyRunJudgeResults(summary.judgeResults),
    stepResults: (summary.stepResults ?? []).map((sr) => ({ id: sr.id, status: sr.status }))
  };
}

/**
 * Validate and normalize the strategy-runs response into `Run[]`. Shared by the
 * SSR page and the client poll so both produce identical objects.
 */
export function normalizeStrategyRuns(raw: unknown): Run[] {
  return parseOrFallback(strategyRunSummaryArraySchema, raw, [], "strategy runs").map(toRun);
}
