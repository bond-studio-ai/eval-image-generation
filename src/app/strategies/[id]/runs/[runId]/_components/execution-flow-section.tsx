import { type DagStep, StrategyFlowDag } from "@/components/strategy-flow-dag";
import type { StrategyRunJudgeResultEntry } from "@/lib/strategy-run-judge-results";
import { SectionToggle } from "./shared";
import type { StepGroup } from "./types";

function deriveDagStatus(results: StepGroup["results"]): NonNullable<DagStep["status"]> {
  if (results.some((result) => result.status === "running")) return "running";
  if (results.some((result) => result.status === "completed")) return "completed";
  if (results.some((result) => result.status === "failed")) return "failed";
  return (results[0]?.status as DagStep["status"]) ?? "pending";
}

export function ExecutionFlowSection({ stepGroups, judgeResults, open, onToggle }: { stepGroups: StepGroup[]; judgeResults: StrategyRunJudgeResultEntry[]; open: boolean; onToggle: () => void }) {
  const dagSteps: DagStep[] = stepGroups.flatMap((group) => {
    if (!group.step) return [];
    const status = deriveDagStatus(group.results);
    return [
      {
        stepOrder: group.stepOrder,
        label: group.name,
        model: group.step.model,
        aspectRatio: group.step.aspectRatio,
        outputResolution: group.step.outputResolution,
        temperature: group.step.temperature,
        promptName: group.step.promptVersion?.name ?? null,
        dollhouseViewFromStep: group.step.dollhouseViewFromStep,
        realPhotoFromStep: group.step.realPhotoFromStep,
        moodBoardFromStep: group.step.moodBoardFromStep,
        status,
        error: group.results.find((result) => result.error)?.error ?? null
      }
    ];
  });

  if (dagSteps.length === 0) return null;

  const dagJudges = Array.from(new Map(judgeResults.map((j) => [j.strategyJudgeId, j])).values())
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
