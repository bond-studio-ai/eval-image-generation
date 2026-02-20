import { db } from '@/db';
import { strategyRun, strategyStepResult } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { RunDetail } from './run-detail';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string; runId: string }>;
}

export default async function StrategyRunPage({ params }: PageProps) {
  const { id, runId } = await params;

  const run = await db.query.strategyRun.findFirst({
    where: eq(strategyRun.id, runId),
    with: {
      strategy: { columns: { id: true, name: true } },
      stepResults: {
        orderBy: [strategyStepResult.strategyStepId],
        with: {
          step: {
            columns: { stepOrder: true, name: true, model: true, aspectRatio: true, outputResolution: true, temperature: true, dollhouseViewFromStep: true, realPhotoFromStep: true, moodBoardFromStep: true },
            with: {
              promptVersion: { columns: { id: true, name: true } },
            },
          },
        },
      },
    },
  });

  if (!run || run.strategy.id !== id) {
    notFound();
  }

  const initialData = {
    id: run.id,
    status: run.status,
    createdAt: run.createdAt.toISOString(),
    completedAt: run.completedAt?.toISOString() ?? null,
    strategy: { id: run.strategy.id, name: run.strategy.name },
    stepResults: run.stepResults.map((sr) => ({
      id: sr.id,
      status: sr.status,
      outputUrl: sr.outputUrl,
      error: sr.error,
      executionTime: sr.executionTime,
      generationId: sr.generationId,
      step: sr.step
        ? {
            stepOrder: sr.step.stepOrder,
            name: sr.step.name,
            model: sr.step.model,
            aspectRatio: sr.step.aspectRatio,
            outputResolution: sr.step.outputResolution,
            temperature: sr.step.temperature,
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
