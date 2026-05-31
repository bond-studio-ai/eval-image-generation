/** Per-judge evaluation row for a strategy run (from strategy_run_judge_result + judge config). */
export interface StrategyRunJudgeResultEntry {
  id: string;
  strategyRunId: string;
  strategyJudgeId: string;
  judgeModel: string;
  judgeName: string | null;
  judgePromptVersionId: string;
  judgePromptVersionName: string | null;
  position: number;
  judgeType: "batch" | "individual";
  judgeScore: number | null;
  judgeReasoning: string | null;
  judgeOutput: string | null;
  judgeSystemPrompt: string | null;
  judgeUserPrompt: string | null;
  judgeInputImages:
    | {
        url: string;
        label: string;
        isComposite?: boolean;
        sourceImages?: { url: string; label: string }[];
      }[]
    | null;
  judgeTypeUsed: string | null;
  candidateIndex: number | null;
  /** Wall-clock duration (ms) of the judge invocation, or null for legacy rows. */
  executionTimeMs: number | null;
}

/** Raw, unvalidated shape of a judge-result row as it arrives from the API. */
interface RawJudgeResult {
  id?: unknown;
  strategyRunId?: unknown;
  strategyJudgeId?: unknown;
  judgeModel?: unknown;
  judgeName?: unknown;
  judgePromptVersionId?: unknown;
  judgePromptVersionName?: unknown;
  position?: unknown;
  judgeType?: unknown;
  judgeScore?: unknown;
  judgeReasoning?: unknown;
  judgeOutput?: unknown;
  judgeSystemPrompt?: unknown;
  judgeUserPrompt?: unknown;
  judgeInputImages?: unknown;
  judgeTypeUsed?: unknown;
  candidateIndex?: unknown;
  executionTimeMs?: unknown;
}

/** Raw payload wrapper exposing the unvalidated `judgeResults` field of a run. */
export interface RawRunJudgeResults {
  judgeResults?: unknown;
}

/** Normalize `judgeResults` from a strategy run API payload. */
export function parseStrategyRunJudgeResults(value: unknown): StrategyRunJudgeResultEntry[] {
  if (!Array.isArray(value)) return [];
  const out: StrategyRunJudgeResultEntry[] = [];
  for (const row of value) {
    if (row == null || typeof row !== "object") continue;
    const result = row as RawJudgeResult;
    const id = result.id == null ? "" : String(result.id);
    if (!id) continue;
    const imgs = result.judgeInputImages;
    out.push({
      id,
      strategyRunId: result.strategyRunId == null ? "" : String(result.strategyRunId),
      strategyJudgeId: result.strategyJudgeId == null ? "" : String(result.strategyJudgeId),
      judgeModel: result.judgeModel == null ? "" : String(result.judgeModel),
      judgeName: result.judgeName == null ? null : String(result.judgeName),
      judgePromptVersionId: result.judgePromptVersionId == null ? "" : String(result.judgePromptVersionId),
      judgePromptVersionName: result.judgePromptVersionName == null ? null : String(result.judgePromptVersionName),
      position: typeof result.position === "number" ? result.position : Number(result.position) || 0,
      judgeType: result.judgeType === "individual" ? "individual" : "batch",
      judgeScore: typeof result.judgeScore === "number" ? result.judgeScore : result.judgeScore == null ? null : Number(result.judgeScore),
      judgeReasoning: result.judgeReasoning == null ? null : String(result.judgeReasoning),
      judgeOutput: result.judgeOutput == null ? null : String(result.judgeOutput),
      judgeSystemPrompt: result.judgeSystemPrompt == null ? null : String(result.judgeSystemPrompt),
      judgeUserPrompt: result.judgeUserPrompt == null ? null : String(result.judgeUserPrompt),
      judgeInputImages: Array.isArray(imgs) ? (imgs as StrategyRunJudgeResultEntry["judgeInputImages"]) : null,
      judgeTypeUsed: result.judgeTypeUsed == null ? null : String(result.judgeTypeUsed),
      candidateIndex: typeof result.candidateIndex === "number" ? result.candidateIndex : result.candidateIndex == null ? null : Number(result.candidateIndex),
      executionTimeMs: typeof result.executionTimeMs === "number" ? result.executionTimeMs : result.executionTimeMs == null ? null : Number(result.executionTimeMs)
    });
  }
  return out;
}
