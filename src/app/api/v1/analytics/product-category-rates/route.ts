import { db } from '@/db';
import {
  generation,
  generationResult,
  resultEvaluation,
  strategy,
  strategyRun,
  strategyStepResult,
} from '@/db/schema';
import { successResponse } from '@/lib/api-response';
import { and, eq, gte, isNotNull, lte, sql } from 'drizzle-orm';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

function pct(n: number, total: number) {
  return total > 0 ? Math.round((n / total) * 10000) / 100 : 0;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const strategyId = searchParams.get('strategy_id');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const model = searchParams.get('model');

    const conditions = [isNotNull(strategyStepResult.generationId)];
    if (strategyId) conditions.push(eq(strategyRun.strategyId, strategyId));
    if (model) conditions.push(eq(strategy.model, model));
    if (from) conditions.push(gte(generation.createdAt, new Date(from)));
    if (to) {
      const endOfDay = new Date(to);
      endOfDay.setHours(23, 59, 59, 999);
      conditions.push(lte(generation.createdAt, endOfDay));
    }

    const evaluations = await db
      .select({
        productAccuracy: resultEvaluation.productAccuracy,
      })
      .from(resultEvaluation)
      .innerJoin(generationResult, eq(generationResult.id, resultEvaluation.resultId))
      .innerJoin(generation, eq(generation.id, generationResult.generationId))
      .innerJoin(
        strategyStepResult,
        and(
          eq(strategyStepResult.generationId, generation.id),
          isNotNull(strategyStepResult.generationId),
        ),
      )
      .innerJoin(strategyRun, eq(strategyRun.id, strategyStepResult.strategyRunId))
      .innerJoin(strategy, eq(strategy.id, strategyRun.strategyId))
      .where(and(...conditions));

    const categoryStats = new Map<string, { success: number; failure: number }>();

    for (const row of evaluations) {
      if (!row.productAccuracy) continue;
      try {
        const categories: Record<string, { issues?: string[] }> = JSON.parse(row.productAccuracy);
        for (const [catName, catData] of Object.entries(categories)) {
          const stats = categoryStats.get(catName) ?? { success: 0, failure: 0 };
          if (Array.isArray(catData.issues) && catData.issues.length > 0) {
            stats.failure++;
          } else {
            stats.success++;
          }
          categoryStats.set(catName, stats);
        }
      } catch { /* malformed JSON */ }
    }

    const categories = Array.from(categoryStats.entries())
      .map(([name, stats]) => {
        const total = stats.success + stats.failure;
        return {
          name,
          total,
          success: stats.success,
          failure: stats.failure,
          successPct: pct(stats.success, total),
          failurePct: pct(stats.failure, total),
        };
      })
      .sort((a, b) => b.total - a.total);

    return successResponse({ categories });
  } catch (error) {
    console.error('Error fetching product category rates:', error);
    return successResponse({ categories: [] });
  }
}
