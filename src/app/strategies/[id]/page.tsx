import { StrategyFlowDag, type DagStep } from '@/components/strategy-flow-dag';
import { DeployToEnvironmentButton } from '@/components/deploy-to-environment-button';
import { PageHeader, PrimaryLinkButton } from '@/components/page-header';
import { fetchStrategyById, fetchStrategyRuns, parseStrategyRunJudgeResults } from '@/lib/service-client';
import { notFound } from 'next/navigation';
import { ActiveToggleButton } from './active-toggle-button';
import { CloneButton } from './clone-button';
import { StrategyPerformance } from './strategy-performance';
import { StrategyRunsSection } from './runs-section';
import { StrategySettingsPrompts } from './strategy-settings-prompts';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function StrategyDetailPage({ params }: PageProps) {
  const { id } = await params;

  const [result, runsRaw] = await Promise.all([
    fetchStrategyById(id),
    fetchStrategyRuns(id, 50),
  ]);

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
            <DeployToEnvironmentButton strategyId={result.id} />
            <ActiveToggleButton strategyId={result.id} isActive={result.isActive} />
            <CloneButton strategyId={result.id} />
            <PrimaryLinkButton href={`/strategies/${result.id}/edit`} icon>Edit Strategy</PrimaryLinkButton>
          </>
        }
      />

      {/* Execution Flow */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900">Execution Flow</h2>
        {result.steps.length === 0 ? (
          <p className="mt-4 text-sm text-gray-600">No steps defined. Edit this strategy to add steps.</p>
        ) : (
          <div className="mt-4">
            <StrategyFlowDag
              steps={result.steps
                .filter((step) => (step.type ?? 'generation') !== 'judge')
                .map((step): DagStep => ({
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
                  arbitraryImageFromStep: step.arbitraryImageFromStep,
                }))}
              judges={result.steps
                .filter((step) => step.type === 'judge')
                .flatMap((step) => (step.judges ?? []).map((j, ji) => ({
                  name: j.name,
                  type: j.judgeType as 'batch' | 'individual',
                  model: j.judgeModel,
                  promptName: j.judgePromptVersionName,
                  toleranceThreshold: j.toleranceThreshold,
                  position: ji + 1,
                })))}
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
        checkSceneAccuracy={result.checkSceneAccuracy ?? false}
        description={result.description}
        steps={result.steps.map((s) => ({
          stepOrder: s.stepOrder,
          type: s.type ?? 'generation' as const,
          numberOfImages: s.numberOfImages,
          name: s.name,
          promptVersionId: s.promptVersionId,
          promptVersionName: s.promptVersionName,
          judges: (s.judges ?? []).map((j) => ({
            name: j.name,
            judgeModel: j.judgeModel,
            judgeType: j.judgeType as 'batch' | 'individual',
            toleranceThreshold: j.toleranceThreshold,
            judgePromptVersionId: j.judgePromptVersionId,
            judgePromptVersionName: j.judgePromptVersionName,
          })),
        }))}
        preview={{
          previewModel: result.previewModel,
          previewResolution: result.previewResolution,
        }}
      />

      <StrategyPerformance strategyId={result.id} />

      {/* Runs section */}
      <StrategyRunsSection
        strategyId={result.id}
        hasJudge={result.steps.some((s) => s.type === 'judge')}
        initialRuns={runsRaw.map((run) => {
          const inputPresetName =
            (run.inputPresetName as string) ??
            (run.inputPresets as { inputPresetName?: string }[] | undefined)?.[0]?.inputPresetName ??
            null;
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
              status: sr.status,
            })),
          };
        })}
      />
    </div>
  );
}
