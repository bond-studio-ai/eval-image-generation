import { db } from '@/db';
import { generation, strategyRun, strategyStep, strategyStepResult } from '@/db/schema';
import { errorResponse, successResponse } from '@/lib/api-response';
import { uuidSchema } from '@/lib/validation';
import { eq, inArray } from 'drizzle-orm';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

/** POST: mark all outputs of this batch as failed (set scene + product rating to FAILED on generations). */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> },
) {
  try {
    const { batchId } = await params;
    if (!uuidSchema.safeParse(batchId).success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid batch ID');
    }

    const runs = await db
      .select({ id: strategyRun.id })
      .from(strategyRun)
      .where(eq(strategyRun.batchRunId, batchId));

    if (runs.length === 0) {
      return successResponse({ updated: 0 });
    }

    const runIds = runs.map((r) => r.id);

    const results = await db
      .select({
        strategyRunId: strategyStepResult.strategyRunId,
        generationId: strategyStepResult.generationId,
        stepOrder: strategyStep.stepOrder,
      })
      .from(strategyStepResult)
      .innerJoin(strategyStep, eq(strategyStepResult.strategyStepId, strategyStep.id))
      .where(
        inArray(strategyStepResult.strategyRunId, runIds),
      );

    const lastGenerationIds = new Set<string>();
    const byRun = new Map<string, { generationId: string | null; stepOrder: number }[]>();
    for (const r of results) {
      if (!byRun.has(r.strategyRunId)) byRun.set(r.strategyRunId, []);
      byRun.get(r.strategyRunId)!.push({
        generationId: r.generationId,
        stepOrder: r.stepOrder,
      });
    }
    for (const [, arr] of byRun) {
      const withGen = arr.filter((a) => a.generationId != null);
      if (withGen.length === 0) continue;
      const best = withGen.reduce((a, b) => (a.stepOrder > b.stepOrder ? a : b));
      lastGenerationIds.add(best.generationId!);
    }

    if (lastGenerationIds.size === 0) {
      return successResponse({ updated: 0 });
    }

    const genIds = Array.from(lastGenerationIds);
    const updated = await db
      .update(generation)
      .set({
        sceneAccuracyRating: 'FAILED',
        productAccuracyRating: 'FAILED',
      })
      .where(inArray(generation.id, genIds))
      .returning({ id: generation.id });

    return successResponse({ updated: updated.length });
  } catch (error) {
    console.error('Error marking batch as failed:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to mark batch as failed');
  }
}
