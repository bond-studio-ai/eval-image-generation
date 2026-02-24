import { db } from '@/db';
import { strategy, strategyRun, strategyStep, strategyStepResult } from '@/db/schema';
import { errorResponse, successResponse } from '@/lib/api-response';
import { executeSteps } from '@/app/api/v1/strategies/[id]/run/route';
import { uuidSchema } from '@/lib/validation';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { after, NextRequest } from 'next/server';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ runId: string }> },
) {
  try {
    const { runId } = await params;

    if (!uuidSchema.safeParse(runId).success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid run ID');
    }

    const run = await db.query.strategyRun.findFirst({
      where: eq(strategyRun.id, runId),
      with: {
        stepResults: true,
      },
    });

    if (!run) {
      return errorResponse('NOT_FOUND', 'Strategy run not found');
    }

    if (run.status !== 'failed' && run.status !== 'skipped') {
      return errorResponse('VALIDATION_ERROR', 'Only failed or skipped runs can be retried');
    }

    const retryableResultIds = run.stepResults
      .filter((sr) => sr.status === 'failed' || sr.status === 'skipped')
      .map((sr) => sr.id);

    if (retryableResultIds.length === 0) {
      return errorResponse('VALIDATION_ERROR', 'No failed or skipped steps to retry');
    }

    await db
      .update(strategyStepResult)
      .set({ status: 'pending', error: null, outputUrl: null, generationId: null, executionTime: null })
      .where(
        and(
          eq(strategyStepResult.strategyRunId, runId),
          inArray(strategyStepResult.id, retryableResultIds),
        ),
      );

    // Set the run back to running
    await db
      .update(strategyRun)
      .set({ status: 'running', completedAt: null })
      .where(eq(strategyRun.id, runId));

    // Fetch the strategy and steps for strategy-level defaults
    const strat = await db.query.strategy.findFirst({
      where: eq(strategy.id, run.strategyId),
      with: {
        steps: {
          orderBy: [strategyStep.stepOrder],
        },
      },
    });

    if (!strat) {
      return errorResponse('NOT_FOUND', 'Strategy not found');
    }

    const strategyDefaults = {
      model: strat.model,
      aspectRatio: strat.aspectRatio,
      outputResolution: strat.outputResolution,
      temperature: strat.temperature,
      useGoogleSearch: strat.useGoogleSearch,
      tagImages: strat.tagImages,
    };

    after(() => executeSteps(runId, strat.steps, strategyDefaults));

    return successResponse({ id: runId, status: 'running' });
  } catch (error) {
    console.error('Error retrying strategy run:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to retry strategy run');
  }
}
