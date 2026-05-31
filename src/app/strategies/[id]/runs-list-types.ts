import type { StrategyRunBatchGroup } from "@/lib/strategy-runs-view";
import type { StrategyRunJudgeResultEntry } from "@/lib/strategy-run-judge-results";

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
