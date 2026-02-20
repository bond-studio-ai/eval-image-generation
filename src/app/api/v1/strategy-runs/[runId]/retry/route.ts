import { db } from '@/db';
import { strategyRun, strategyStep, strategyStepResult } from '@/db/schema';
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

    if (run.status !== 'failed') {
      return errorResponse('VALIDATION_ERROR', 'Only failed runs can be retried');
    }

    const failedResultIds = run.stepResults
      .filter((sr) => sr.status === 'failed')
      .map((sr) => sr.id);

    if (failedResultIds.length === 0) {
      return errorResponse('VALIDATION_ERROR', 'No failed steps to retry');
    }

    // Reset failed step results to pending
    await db
      .update(strategyStepResult)
      .set({ status: 'pending', error: null, outputUrl: null, generationId: null, executionTime: null })
      .where(
        and(
          eq(strategyStepResult.strategyRunId, runId),
          inArray(strategyStepResult.id, failedResultIds),
        ),
      );

    // Set the run back to running
    await db
      .update(strategyRun)
      .set({ status: 'running', completedAt: null })
      .where(eq(strategyRun.id, runId));

    // Fetch the strategy steps
    const steps = await db.query.strategyStep.findMany({
      where: eq(strategyStep.strategyId, run.strategyId),
      orderBy: [asc(strategyStep.stepOrder)],
    });

    after(() => executeSteps(runId, steps));

    return successResponse({ id: runId, status: 'running' });
  } catch (error) {
    console.error('Error retrying strategy run:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to retry strategy run');
  }
}
