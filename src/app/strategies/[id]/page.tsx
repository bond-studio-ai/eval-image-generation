import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { type DagStep, StrategyFlowDag } from "@/components/strategy-flow-dag";
import { LinkButton } from "@/components/ui/button";
import { PlusIcon } from "@/components/ui/icons";
import { fetchStrategyById, fetchStrategyRuns } from "@/lib/service-client";
import { ActiveToggleButton } from "./active-toggle-button";
import { CloneButton } from "./clone-button";
import { normalizeStrategyRuns } from "./runs-list-model";
import { StrategyRunsSection } from "./runs-section";
import { StrategyPerformance } from "./strategy-performance";
import { StrategySettingsPrompts } from "./strategy-settings-prompts";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Strategy" };

interface PageProps {
  params: Promise<{ id: string }>;
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
      <StrategyRunsSection strategyId={result.id} hasJudge={result.steps.some((step) => step.type === "judge")} initialRuns={normalizeStrategyRuns(runsRaw)} />
    </div>
  );
}
