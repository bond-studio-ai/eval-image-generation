import { describe, expect, it } from "vitest";
import type { StrategyRunJudgeResultEntry } from "@/lib/strategy-run-judge-results";
import { buildPanels } from "@/components/judge-score-badge-utils";

describe("buildPanels", () => {
  it("maps judge result entries to detail panels", () => {
    const judgeResults = [
      {
        id: "j1",
        judgeName: "Quality",
        judgeModel: "gemini",
        judgePromptVersionId: "pv1",
        judgePromptVersionName: "v1",
        judgeType: "individual",
        judgeTypeUsed: "individual",
        judgeScore: 85,
        judgeReasoning: "looks good",
        judgeOutput: "out",
        judgeSystemPrompt: "sys",
        judgeUserPrompt: "user"
      }
    ] as StrategyRunJudgeResultEntry[];

    const panels = buildPanels(judgeResults, {});
    expect(panels).toHaveLength(1);
    expect(panels[0]).toMatchObject({ key: "j1", shortLabel: "Quality", rawScore: 85, reasoning: "looks good" });
  });

  it("uses a positional shortLabel when a judge has no name", () => {
    const judgeResults = [
      {
        id: "j1",
        judgeName: null,
        judgeModel: "m",
        judgePromptVersionId: "",
        judgePromptVersionName: null,
        judgeType: "batch",
        judgeTypeUsed: null,
        judgeScore: null,
        judgeReasoning: null,
        judgeOutput: null,
        judgeSystemPrompt: null,
        judgeUserPrompt: null
      }
    ] as StrategyRunJudgeResultEntry[];
    expect(buildPanels(judgeResults, {})[0]?.shortLabel).toBe("#1");
  });

  it("falls back to a single aggregate panel when there are no judge results", () => {
    const panels = buildPanels(null, { judgeScore: 70, judgeReasoning: "agg reason", judgeTypeUsed: "batch" });
    expect(panels).toHaveLength(1);
    expect(panels[0]).toMatchObject({ key: "aggregate", shortLabel: "Judge", rawScore: 70, reasoning: "agg reason" });
  });
});
