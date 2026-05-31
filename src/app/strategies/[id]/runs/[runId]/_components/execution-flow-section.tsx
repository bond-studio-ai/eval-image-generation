import { StrategyFlowDag, type DagStep } from "@/components/strategy-flow-dag";
import type { StrategyRunJudgeResultEntry } from "@/lib/strategy-run-judge-results";
import { SectionToggle } from "./shared";
import type { StepGroup } from "./types";

export function ExecutionFlowSection({ stepGroups, judgeResults, open, onToggle }: { stepGroups: StepGroup[]; judgeResults: StrategyRunJudgeResultEntry[]; open: boolean; onToggle: () => void }) {
  const dagSteps: DagStep[] = stepGroups.flatMap((g) => {
    if (!g.step) return [];
    const anyCompleted = g.results.some((r) => r.status === "completed");
    const anyRunning = g.results.some((r) => r.status === "running");
    const anyFailed = g.results.some((r) => r.status === "failed");
    const status = anyRunning ? "running" : anyCompleted ? "completed" : anyFailed ? "failed" : ((g.results[0]?.status as DagStep["status"]) ?? "pending");
    return [
      {
        stepOrder: g.stepOrder,
        label: g.name,
        model: g.step.model,
        aspectRatio: g.step.aspectRatio,
        outputResolution: g.step.outputResolution,
        temperature: g.step.temperature,
        promptName: g.step.promptVersion?.name ?? null,
        dollhouseViewFromStep: g.step.dollhouseViewFromStep,
        realPhotoFromStep: g.step.realPhotoFromStep,
        moodBoardFromStep: g.step.moodBoardFromStep,
        status,
        error: g.results.find((r) => r.error)?.error ?? null
      }
    ];
  });

  if (dagSteps.length === 0) return null;

  const dagJudges = [...new Map(judgeResults.map((j) => [j.strategyJudgeId, j])).values()]
    .toSorted((a, b) => a.position - b.position)
    .map((j) => ({
      name: j.judgeName,
      type: j.judgeType,
      model: j.judgeModel,
      promptName: j.judgePromptVersionName,
      position: j.position
    }));

  return (
    <SectionToggle title="Execution Flow" open={open} onToggle={onToggle}>
      <div className="p-4">
        <StrategyFlowDag steps={dagSteps} judges={dagJudges} />
      </div>
    </SectionToggle>
  );
}
