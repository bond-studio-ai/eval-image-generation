import { coerceString } from "@/lib/coerce-string";

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
    const id = coerceString(result.id) ?? "";
    if (!id) continue;
    const imgs = result.judgeInputImages;
    out.push({
      id,
      strategyRunId: coerceString(result.strategyRunId) ?? "",
      strategyJudgeId: coerceString(result.strategyJudgeId) ?? "",
      judgeModel: coerceString(result.judgeModel) ?? "",
      judgeName: coerceString(result.judgeName) ?? null,
      judgePromptVersionId: coerceString(result.judgePromptVersionId) ?? "",
      judgePromptVersionName: coerceString(result.judgePromptVersionName) ?? null,
      position: typeof result.position === "number" ? result.position : Number(result.position) || 0,
      judgeType: result.judgeType === "individual" ? "individual" : "batch",
      judgeScore: typeof result.judgeScore === "number" ? result.judgeScore : result.judgeScore == null ? null : Number(result.judgeScore),
      judgeReasoning: coerceString(result.judgeReasoning) ?? null,
      judgeOutput: coerceString(result.judgeOutput) ?? null,
      judgeSystemPrompt: coerceString(result.judgeSystemPrompt) ?? null,
      judgeUserPrompt: coerceString(result.judgeUserPrompt) ?? null,
      judgeInputImages: Array.isArray(imgs) ? (imgs as StrategyRunJudgeResultEntry["judgeInputImages"]) : null,
      judgeTypeUsed: coerceString(result.judgeTypeUsed) ?? null,
      candidateIndex: typeof result.candidateIndex === "number" ? result.candidateIndex : result.candidateIndex == null ? null : Number(result.candidateIndex),
      executionTimeMs: typeof result.executionTimeMs === "number" ? result.executionTimeMs : result.executionTimeMs == null ? null : Number(result.executionTimeMs)
    });
  }
  return out;
}
