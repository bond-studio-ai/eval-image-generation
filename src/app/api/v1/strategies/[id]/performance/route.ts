import { db } from '@/db';
import { generation, strategyRun, strategyStepResult } from '@/db/schema';
import { errorResponse, successResponse } from '@/lib/api-response';
import { uuidSchema } from '@/lib/validation';
import { and, eq, isNotNull } from 'drizzle-orm';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/strategies/[id]/performance
 * Returns strategy performance: generation count, good/failed/not-rated counts and %, avg exec time.
 * Uses last-step results only (strategy_step_result with generation_id set).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!uuidSchema.safeParse(id).success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid strategy ID');
    }

    const stepResultsWithGen = await db
      .select({
        executionTime: strategyStepResult.executionTime,
        sceneAccuracyRating: generation.sceneAccuracyRating,
        productAccuracyRating: generation.productAccuracyRating,
      })
      .from(strategyStepResult)
      .innerJoin(strategyRun, eq(strategyRun.id, strategyStepResult.strategyRunId))
      .innerJoin(generation, eq(generation.id, strategyStepResult.generationId))
      .where(
        and(
          eq(strategyRun.strategyId, id),
          isNotNull(strategyStepResult.generationId),
        ),
      );

    const total = stepResultsWithGen.length;
    let sceneGood = 0;
    let sceneFailed = 0;
    let productGood = 0;
    let productFailed = 0;
    let notRated = 0;
    let execTimeSum = 0;
    let execTimeCount = 0;

    for (const row of stepResultsWithGen) {
      if (row.sceneAccuracyRating === 'GOOD') sceneGood++;
      else if (row.sceneAccuracyRating === 'FAILED') sceneFailed++;
      if (row.productAccuracyRating === 'GOOD') productGood++;
      else if (row.productAccuracyRating === 'FAILED') productFailed++;
      if (row.sceneAccuracyRating == null && row.productAccuracyRating == null) notRated++;
      if (row.executionTime != null) {
        execTimeSum += row.executionTime;
        execTimeCount++;
      }
    }

    const avgExecTimeMs = execTimeCount > 0 ? Math.round(execTimeSum / execTimeCount) : null;

    return successResponse({
      generation_count: total,
      scene_good_count: sceneGood,
      scene_failed_count: sceneFailed,
      product_good_count: productGood,
      product_failed_count: productFailed,
      not_rated_count: notRated,
      scene_good_pct: total > 0 ? Math.round((sceneGood / total) * 10000) / 100 : 0,
      scene_failed_pct: total > 0 ? Math.round((sceneFailed / total) * 10000) / 100 : 0,
      product_good_pct: total > 0 ? Math.round((productGood / total) * 10000) / 100 : 0,
      product_failed_pct: total > 0 ? Math.round((productFailed / total) * 10000) / 100 : 0,
      not_rated_pct: total > 0 ? Math.round((notRated / total) * 10000) / 100 : 0,
      avg_execution_time_ms: avgExecTimeMs,
    });
  } catch (error) {
    console.error('Error fetching strategy performance:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch strategy performance');
  }
}
