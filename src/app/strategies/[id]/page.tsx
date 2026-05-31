import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { type DagStep, StrategyFlowDag } from "@/components/strategy-flow-dag";
import { LinkButton } from "@/components/ui/button";
import { PlusIcon } from "@/components/ui/icons";
import { fetchStrategyById, fetchStrategyRuns } from "@/lib/service-client";
import { parseStrategyRunJudgeResults } from "@/lib/strategy-run-judge-results";
import { ActiveToggleButton } from "./active-toggle-button";
import { CloneButton } from "./clone-button";
import { StrategyRunsSection } from "./runs-section";
import { StrategyPerformance } from "./strategy-performance";
import { StrategySettingsPrompts } from "./strategy-settings-prompts";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Strategy" };

interface PageProps {
  params: Promise<{ id: string }>;
}

interface RawStrategyRunSummary {
  inputPresetName?: unknown;
  inputPresets?: unknown;
  id?: unknown;
  status?: unknown;
  createdAt?: unknown;
  completedAt?: unknown;
  lastOutputUrl?: unknown;
  lastOutputGenerationId?: unknown;
  batchRunId?: unknown;
  groupId?: unknown;
  judgeScore?: unknown;
  isJudgeSelected?: unknown;
  judgeReasoning?: unknown;
  judgeOutput?: unknown;
  judgeSystemPrompt?: unknown;
  judgeUserPrompt?: unknown;
  judgeTypeUsed?: unknown;
  judgeResults?: unknown;
  stepResults?: unknown;
}

export default async function StrategyDetailPage({ params }: PageProps) {
  const { id } = await params;

  const [result, runsRaw] = await Promise.all([fetchStrategyById(id), fetchStrategyRuns(id, 50)]);

  if (!result) {
    notFound();
  }

  return (
    <div>
      <PageHeader
        backHref="/strategies"
        backLabel="Back to Strategies"
        title={result.name}
        subtitle={result.description}
        actions={
          <>
            <ActiveToggleButton strategyId={result.id} activeForSource={result.activeForSource} />
            <CloneButton strategyId={result.id} />
            <LinkButton href={`/strategies/${result.id}/edit`} iconLeft={<PlusIcon className="size-4" />}>
              Edit Strategy
            </LinkButton>
          </>
        }
      />

      {/* Execution Flow */}
      <div className="mt-8">
        <h2 className="text-text-primary text-h3">Execution Flow</h2>
        {result.steps.length === 0 ? (
          <p className="text-text-secondary text-body mt-4">No steps defined. Edit this strategy to add steps.</p>
        ) : (
          <div className="mt-4">
            <StrategyFlowDag
              steps={result.steps.flatMap((step): DagStep[] =>
                (step.type ?? "generation") === "judge"
                  ? []
                  : [
                      {
                        stepOrder: step.stepOrder,
                        label: step.name || `Step ${step.stepOrder}`,
                        model: step.model ?? result.model,
                        aspectRatio: step.aspectRatio ?? result.aspectRatio,
                        outputResolution: step.outputResolution ?? result.outputResolution,
                        temperature: step.temperature ?? result.temperature,
                        promptName: step.promptVersionName,
                        dollhouseViewFromStep: step.dollhouseViewFromStep,
                        realPhotoFromStep: step.realPhotoFromStep,
                        moodBoardFromStep: step.moodBoardFromStep,
                        arbitraryImageFromStep: step.arbitraryImageFromStep
                      }
                    ]
              )}
              judges={result.steps.flatMap((step) =>
                step.type === "judge"
                  ? (step.judges ?? []).map((j, ji) => ({
                      name: j.name,
                      type: j.judgeType,
                      model: j.judgeModel,
                      promptName: j.judgePromptVersionName,
                      toleranceThreshold: j.toleranceThreshold,
                      position: ji + 1
                    }))
                  : []
              )}
            />
          </div>
        )}
      </div>

      {/* Strategy settings & prompts */}
      <StrategySettingsPrompts
        model={result.model}
        aspectRatio={result.aspectRatio}
        outputResolution={result.outputResolution}
        temperature={result.temperature}
        useGoogleSearch={result.useGoogleSearch}
        tagImages={result.tagImages}
        groupProductImages={result.groupProductImages}
        enableMultiTurnContext={result.enableMultiTurnContext ?? false}
        checkSceneAccuracy={result.checkSceneAccuracy ?? false}
        description={result.description}
        steps={result.steps.map((step) => ({
          stepOrder: step.stepOrder,
          type: step.type ?? ("generation" as const),
          numberOfImages: step.numberOfImages,
          name: step.name,
          promptVersionId: step.promptVersionId,
          promptVersionName: step.promptVersionName,
          judges: (step.judges ?? []).map((j) => ({
            name: j.name,
            judgeModel: j.judgeModel,
            judgeType: j.judgeType,
            toleranceThreshold: j.toleranceThreshold,
            judgePromptVersionId: j.judgePromptVersionId,
            judgePromptVersionName: j.judgePromptVersionName
          }))
        }))}
        preview={{
          previewModel: result.previewModel,
          previewResolution: result.previewResolution
        }}
      />

      <StrategyPerformance strategyId={result.id} />

      {/* Runs section */}
      <StrategyRunsSection
        strategyId={result.id}
        hasJudge={result.steps.some((step) => step.type === "judge")}
        initialRuns={runsRaw.map((rawRun) => {
          const run = rawRun as RawStrategyRunSummary;
          const inputPresetName = (run.inputPresetName as string) ?? (run.inputPresets as { inputPresetName?: string }[] | undefined)?.[0]?.inputPresetName ?? null;
          return {
            id: run.id as string,
            status: run.status as string,
            createdAt: run.createdAt as string,
            completedAt: (run.completedAt as string) ?? null,
            inputPresetName,
            lastOutputUrl: (run.lastOutputUrl as string) ?? null,
            lastOutputGenerationId: (run.lastOutputGenerationId as string) ?? null,
            batchRunId: (run.batchRunId as string) ?? null,
            groupId: (run.groupId as string) ?? null,
            judgeScore: (run.judgeScore as number) ?? null,
            isJudgeSelected: (run.isJudgeSelected as boolean) ?? false,
            judgeReasoning: (run.judgeReasoning as string) ?? null,
            judgeOutput: (run.judgeOutput as string) ?? null,
            judgeSystemPrompt: (run.judgeSystemPrompt as string) ?? null,
            judgeUserPrompt: (run.judgeUserPrompt as string) ?? null,
            judgeTypeUsed: (run.judgeTypeUsed as string) ?? null,
            judgeResults: parseStrategyRunJudgeResults(run.judgeResults),
            stepResults: ((run.stepResults as { id: string; status: string }[]) ?? []).map((sr) => ({
              id: sr.id,
              status: sr.status
            }))
          };
        })}
      />
    </div>
  );
}
