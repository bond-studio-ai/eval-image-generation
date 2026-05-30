import type { StrategyRunJudgeResultEntry } from "@/lib/strategy-run-judge-results";

export type DetailPanel = {
  key: string;
  shortLabel: string;
  judgeName: string | null;
  judgeModel: string;
  judgePromptVersionId: string;
  judgePromptVersionName: string | null;
  judgeType: "batch" | "individual";
  judgeTypeUsed: string | null;
  rawScore: number | null;
  reasoning: string | null;
  output: string | null;
  systemPrompt: string | null;
  userPrompt: string | null;
};

export function buildPanels(
  judgeResults: StrategyRunJudgeResultEntry[] | null | undefined,
  agg: {
    judgeReasoning?: string | null;
    judgeOutput?: string | null;
    judgeSystemPrompt?: string | null;
    judgeUserPrompt?: string | null;
    judgeTypeUsed?: string | null;
    judgeScore?: number | null;
  }
): DetailPanel[] {
  if (judgeResults && judgeResults.length > 0) {
    return judgeResults.map((j, i) => ({
      key: j.id,
      shortLabel: j.judgeName || `#${i + 1}`,
      judgeName: j.judgeName ?? null,
      judgeModel: j.judgeModel,
      judgePromptVersionId: j.judgePromptVersionId,
      judgePromptVersionName: j.judgePromptVersionName,
      judgeType: j.judgeType,
      judgeTypeUsed: j.judgeTypeUsed,
      rawScore: j.judgeScore,
      reasoning: j.judgeReasoning,
      output: j.judgeOutput,
      systemPrompt: j.judgeSystemPrompt,
      userPrompt: j.judgeUserPrompt
    }));
  }
  return [
    {
      key: "aggregate",
      shortLabel: "Judge",
      judgeName: null,
      judgeModel: "",
      judgePromptVersionId: "",
      judgePromptVersionName: null,
      judgeType: "batch",
      judgeTypeUsed: agg.judgeTypeUsed ?? null,
      rawScore: agg.judgeScore ?? null,
      reasoning: agg.judgeReasoning ?? null,
      output: agg.judgeOutput ?? null,
      systemPrompt: agg.judgeSystemPrompt ?? null,
      userPrompt: agg.judgeUserPrompt ?? null
    }
  ];
}
