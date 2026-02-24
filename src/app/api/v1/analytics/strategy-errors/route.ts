import { db } from '@/db';
import {
  generation,
  generationResult,
  resultEvaluation,
  strategyRun,
  strategyStepResult,
} from '@/db/schema';
import { errorResponse, successResponse } from '@/lib/api-response';
import { uuidSchema } from '@/lib/validation';
import { and, eq, isNotNull, sql } from 'drizzle-orm';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET ?strategy_id=...
 * Returns a comprehensive breakdown for a strategy:
 * - execution_errors: failed step results grouped by error text
 * - scene_issues: scene accuracy issues from evaluations, with counts
 * - product_issues: product accuracy issues from evaluations, with counts
 * - rating_summary: generation counts by scene/product rating status
 */
export async function GET(request: NextRequest) {
  try {
    const strategyId = request.nextUrl.searchParams.get('strategy_id');
    if (!strategyId || !uuidSchema.safeParse(strategyId).success) {
      return errorResponse('VALIDATION_ERROR', 'Valid strategy_id is required');
    }

    const [executionErrors, evaluations, ratingSummaryRows] = await Promise.all([
      db
        .select({
          reason: sql<string>`COALESCE(SUBSTRING(${strategyStepResult.error} FROM 1 FOR 200), '(no message)')`,
          count: sql<number>`COUNT(*)::int`,
        })
        .from(strategyStepResult)
        .innerJoin(strategyRun, eq(strategyStepResult.strategyRunId, strategyRun.id))
        .where(
          and(
            eq(strategyRun.strategyId, strategyId),
            eq(strategyStepResult.status, 'failed'),
          ),
        )
        .groupBy(sql`COALESCE(SUBSTRING(${strategyStepResult.error} FROM 1 FOR 200), '(no message)')`)
        .orderBy(sql`COUNT(*) DESC`),

      db
        .select({
          sceneAccuracyIssues: resultEvaluation.sceneAccuracyIssues,
          productAccuracy: resultEvaluation.productAccuracy,
        })
        .from(resultEvaluation)
        .innerJoin(generationResult, eq(generationResult.id, resultEvaluation.resultId))
        .innerJoin(generation, eq(generation.id, generationResult.generationId))
        .innerJoin(strategyStepResult, and(
          eq(strategyStepResult.generationId, generation.id),
          isNotNull(strategyStepResult.generationId),
        ))
        .innerJoin(strategyRun, eq(strategyRun.id, strategyStepResult.strategyRunId))
        .where(eq(strategyRun.strategyId, strategyId)),

      db
        .select({
          total: sql<number>`COUNT(${generation.id})::int`,
          sceneGood: sql<number>`COUNT(*) FILTER (WHERE ${generation.sceneAccuracyRating} = 'GOOD')::int`,
          sceneFailed: sql<number>`COUNT(*) FILTER (WHERE ${generation.sceneAccuracyRating} = 'FAILED')::int`,
          sceneUnset: sql<number>`COUNT(*) FILTER (WHERE ${generation.id} IS NOT NULL AND ${generation.sceneAccuracyRating} IS NULL)::int`,
          productGood: sql<number>`COUNT(*) FILTER (WHERE ${generation.productAccuracyRating} = 'GOOD')::int`,
          productFailed: sql<number>`COUNT(*) FILTER (WHERE ${generation.productAccuracyRating} = 'FAILED')::int`,
          productUnset: sql<number>`COUNT(*) FILTER (WHERE ${generation.id} IS NOT NULL AND ${generation.productAccuracyRating} IS NULL)::int`,
        })
        .from(strategyStepResult)
        .innerJoin(strategyRun, eq(strategyRun.id, strategyStepResult.strategyRunId))
        .innerJoin(generation, eq(generation.id, strategyStepResult.generationId))
        .where(
          and(
            eq(strategyRun.strategyId, strategyId),
            isNotNull(strategyStepResult.generationId),
          ),
        ),
    ]);

    const sceneIssueCounts: Record<string, number> = {};
    const productIssueCounts: Record<string, number> = {};

    for (const row of evaluations) {
      if (row.sceneAccuracyIssues) {
        try {
          const issues: string[] = JSON.parse(row.sceneAccuracyIssues);
          for (const issue of issues) {
            sceneIssueCounts[issue] = (sceneIssueCounts[issue] ?? 0) + 1;
          }
        } catch { /* malformed JSON */ }
      }
      if (row.productAccuracy) {
        try {
          const categories: Record<string, { issues?: string[] }> = JSON.parse(row.productAccuracy);
          for (const catData of Object.values(categories)) {
            if (Array.isArray(catData.issues)) {
              for (const issue of catData.issues) {
                productIssueCounts[issue] = (productIssueCounts[issue] ?? 0) + 1;
              }
            }
          }
        } catch { /* malformed JSON */ }
      }
    }

    const toSorted = (counts: Record<string, number>) =>
      Object.entries(counts)
        .map(([issue, count]) => ({ issue, count }))
        .sort((a, b) => b.count - a.count);

    const rs = ratingSummaryRows[0];
    const data = {
      execution_errors: executionErrors.map((r) => ({ reason: r.reason, count: r.count })),
      scene_issues: toSorted(sceneIssueCounts),
      product_issues: toSorted(productIssueCounts),
      rating_summary: rs
        ? {
            total: rs.total,
            scene_good: rs.sceneGood,
            scene_failed: rs.sceneFailed,
            scene_unset: rs.sceneUnset,
            product_good: rs.productGood,
            product_failed: rs.productFailed,
            product_unset: rs.productUnset,
          }
        : null,
    };

    return successResponse(data);
  } catch (error) {
    console.error('Error fetching strategy breakdown:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch strategy breakdown');
  }
}
