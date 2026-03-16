import { fetchStrategyRunById } from '@/lib/service-client';
import { notFound } from 'next/navigation';
import { RunDetail } from './run-detail';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string; runId: string }>;
}

export default async function StrategyRunPage({ params }: PageProps) {
  const { id, runId } = await params;

  const run = await fetchStrategyRunById(runId);

  if (!run || (run.strategy as { id: string } | undefined)?.id !== id) {
    notFound();
  }

  const strategy = run.strategy as {
    id: string;
    name: string;
    model: string;
    aspectRatio: string;
    outputResolution: string;
    temperature: string | null;
    useGoogleSearch: boolean;
    tagImages: boolean;
    judgeType: string | null;
  };

  const stepResults = run.stepResults as {
    id: string;
    status: string;
    outputUrl: string | null;
    error: string | null;
    executionTime: number | null;
    generationId: string | null;
    processedUserPrompt: string | null;
    processedSystemPrompt: string | null;
    inputImages: { url: string; label: string }[] | null;
    requestConfig: Record<string, unknown> | null;
    step: {
      stepOrder: number;
      name: string | null;
      model: string | null;
      aspectRatio: string | null;
      outputResolution: string | null;
      temperature: string | null;
      dollhouseViewFromStep: number | null;
      realPhotoFromStep: number | null;
      moodBoardFromStep: number | null;
      promptVersion: { id: string; name: string | null } | null;
    } | null;
  }[];

  const initialData = {
    id: run.id as string,
    status: run.status as string,
    createdAt: run.createdAt as string,
    completedAt: (run.completedAt as string) ?? null,
    judgeScore: (run.judgeScore as number) ?? null,
    isJudgeSelected: (run.isJudgeSelected as boolean) ?? false,
    judgeReasoning: (run.judgeReasoning as string) ?? null,
    judgeOutput: (run.judgeOutput as string) ?? null,
    source: (run.source as string) ?? null,
    judgeSystemPrompt: (run.judgeSystemPrompt as string) ?? null,
    judgeUserPrompt: (run.judgeUserPrompt as string) ?? null,
    judgeInputImages: (run.judgeInputImages as { url: string; label: string }[]) ?? null,
    judgeTypeUsed: (run.judgeTypeUsed as string) ?? null,
    strategy: {
      id: strategy.id,
      name: strategy.name,
      model: strategy.model,
      aspectRatio: strategy.aspectRatio,
      outputResolution: strategy.outputResolution,
      temperature: strategy.temperature,
      useGoogleSearch: strategy.useGoogleSearch,
      tagImages: strategy.tagImages,
      hasJudge: !!strategy.judgeType,
    },
    stepResults: stepResults.map((sr) => ({
      id: sr.id,
      status: sr.status,
      outputUrl: sr.outputUrl,
      error: sr.error,
      executionTime: sr.executionTime,
      generationId: sr.generationId,
      processedUserPrompt: sr.processedUserPrompt,
      processedSystemPrompt: sr.processedSystemPrompt,
      inputImages: sr.inputImages,
      requestConfig: sr.requestConfig,
      step: sr.step
        ? {
            stepOrder: sr.step.stepOrder,
            name: sr.step.name,
            model: sr.step.model ?? strategy.model,
            aspectRatio: sr.step.aspectRatio ?? strategy.aspectRatio,
            outputResolution: sr.step.outputResolution ?? strategy.outputResolution,
            temperature: sr.step.temperature ?? strategy.temperature,
            dollhouseViewFromStep: sr.step.dollhouseViewFromStep,
            realPhotoFromStep: sr.step.realPhotoFromStep,
            moodBoardFromStep: sr.step.moodBoardFromStep,
            promptVersion: sr.step.promptVersion,
          }
        : null,
    })),
  };

  return <RunDetail strategyId={id} runId={runId} initialData={initialData} />;
}
