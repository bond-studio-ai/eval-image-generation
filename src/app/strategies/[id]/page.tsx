import { StrategyFlowDag, type DagStep, type DagJudge } from '@/components/strategy-flow-dag';
import { fetchPromptVersionById, fetchStrategyById, fetchStrategyRuns } from '@/lib/service-client';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ActiveToggleButton } from './active-toggle-button';
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

  let judgePromptName: string | null = null;
  if (result.judgePromptVersionId) {
    try {
      const pv = await fetchPromptVersionById(result.judgePromptVersionId);
      judgePromptName = (pv?.name as string) ?? null;
    } catch { /* prompt may have been deleted */ }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <Link href="/strategies" className="text-sm text-gray-600 hover:text-gray-900">
            &larr; Back to Strategies
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">{result.name}</h1>
          {result.description && (
            <p className="mt-1 text-sm text-gray-600">{result.description}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <ActiveToggleButton strategyId={result.id} isActive={result.isActive} />
          <Link
            href={`/strategies/${result.id}/edit`}
            className="bg-primary-600 hover:bg-primary-700 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
            </svg>
            Edit Strategy
          </Link>
        </div>
      </div>

      {/* Execution Flow */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900">Execution Flow</h2>
        {result.steps.length === 0 ? (
          <p className="mt-4 text-sm text-gray-600">No steps defined. Edit this strategy to add steps.</p>
        ) : (
          <div className="mt-4">
            <StrategyFlowDag
              steps={result.steps.map((step): DagStep => ({
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
              judge={result.judgeType && result.judgeModel ? {
                type: result.judgeType,
                model: result.judgeModel,
                promptName: judgePromptName,
              } : null}
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
        description={result.description}
        steps={result.steps.map((s) => ({
          stepOrder: s.stepOrder,
          name: s.name,
          promptVersionId: s.promptVersionId,
          promptVersionName: s.promptVersionName,
        }))}
        judge={{
          judgeType: result.judgeType,
          judgeModel: result.judgeModel,
          judgePromptVersionId: result.judgePromptVersionId,
          judgePromptVersionName: judgePromptName,
        }}
      />

      <StrategyPerformance strategyId={result.id} />

      {/* Runs section */}
      <StrategyRunsSection
        strategyId={result.id}
        hasJudge={!!result.judgeType}
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
            judgeScore: (run.judgeScore as number) ?? null,
            isJudgeSelected: (run.isJudgeSelected as boolean) ?? false,
            judgeReasoning: (run.judgeReasoning as string) ?? null,
            judgeSystemPrompt: (run.judgeSystemPrompt as string) ?? null,
            judgeUserPrompt: (run.judgeUserPrompt as string) ?? null,
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
