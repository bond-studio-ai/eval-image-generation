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

/** Normalize `judgeResults` from a strategy run API payload. */
export function parseStrategyRunJudgeResults(value: unknown): StrategyRunJudgeResultEntry[] {
  if (!Array.isArray(value)) return [];
  const out: StrategyRunJudgeResultEntry[] = [];
  for (const row of value) {
    if (row == null || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const id = r.id != null ? String(r.id) : "";
    if (!id) continue;
    const imgs = r.judgeInputImages;
    out.push({
      id,
      strategyRunId: r.strategyRunId != null ? String(r.strategyRunId) : "",
      strategyJudgeId: r.strategyJudgeId != null ? String(r.strategyJudgeId) : "",
      judgeModel: r.judgeModel != null ? String(r.judgeModel) : "",
      judgeName: r.judgeName != null ? String(r.judgeName) : null,
      judgePromptVersionId: r.judgePromptVersionId != null ? String(r.judgePromptVersionId) : "",
      judgePromptVersionName: r.judgePromptVersionName != null ? String(r.judgePromptVersionName) : null,
      position: typeof r.position === "number" ? r.position : Number(r.position) || 0,
      judgeType: r.judgeType === "individual" ? "individual" : "batch",
      judgeScore: typeof r.judgeScore === "number" ? r.judgeScore : r.judgeScore != null ? Number(r.judgeScore) : null,
      judgeReasoning: r.judgeReasoning != null ? String(r.judgeReasoning) : null,
      judgeOutput: r.judgeOutput != null ? String(r.judgeOutput) : null,
      judgeSystemPrompt: r.judgeSystemPrompt != null ? String(r.judgeSystemPrompt) : null,
      judgeUserPrompt: r.judgeUserPrompt != null ? String(r.judgeUserPrompt) : null,
      judgeInputImages: Array.isArray(imgs) ? (imgs as StrategyRunJudgeResultEntry["judgeInputImages"]) : null,
      judgeTypeUsed: r.judgeTypeUsed != null ? String(r.judgeTypeUsed) : null,
      candidateIndex: typeof r.candidateIndex === "number" ? r.candidateIndex : r.candidateIndex != null ? Number(r.candidateIndex) : null,
      executionTimeMs: typeof r.executionTimeMs === "number" ? r.executionTimeMs : r.executionTimeMs != null ? Number(r.executionTimeMs) : null
    });
  }
  return out;
}
