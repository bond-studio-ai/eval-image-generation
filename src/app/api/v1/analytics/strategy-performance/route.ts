import { db } from '@/db';
import { generation, strategy, strategyRun, strategyStepResult } from '@/db/schema';
import { successResponse } from '@/lib/api-response';
import { and, eq, gte, isNotNull, isNull, lte, sql } from 'drizzle-orm';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

function pct(n: number, total: number) {
  return total > 0 ? Math.round((n / total) * 10000) / 100 : 0;
}

/** GET: list strategies with generation count, scene/product good/failed %, not-rated %, avg exec time. */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const model = searchParams.get('model');

    const conditions = [isNull(strategy.deletedAt)];
    if (model) conditions.push(eq(strategy.model, model));
    if (from) conditions.push(gte(generation.createdAt, new Date(from)));
    if (to) {
      const endOfDay = new Date(to);
      endOfDay.setHours(23, 59, 59, 999);
      conditions.push(lte(generation.createdAt, endOfDay));
    }

    const rows = await db
      .select({
        id: strategy.id,
        name: strategy.name,
        model: strategy.model,
        generationCount: sql<number>`COUNT(${generation.id})::int`,
        sceneGoodCount: sql<number>`COUNT(*) FILTER (WHERE ${generation.sceneAccuracyRating} = 'GOOD')::int`,
        sceneFailedCount: sql<number>`COUNT(*) FILTER (WHERE ${generation.sceneAccuracyRating} = 'FAILED')::int`,
        sceneUnsetCount: sql<number>`COUNT(*) FILTER (WHERE ${generation.id} IS NOT NULL AND ${generation.sceneAccuracyRating} IS NULL)::int`,
        productGoodCount: sql<number>`COUNT(*) FILTER (WHERE ${generation.productAccuracyRating} = 'GOOD')::int`,
        productFailedCount: sql<number>`COUNT(*) FILTER (WHERE ${generation.productAccuracyRating} = 'FAILED')::int`,
        productUnsetCount: sql<number>`COUNT(*) FILTER (WHERE ${generation.id} IS NOT NULL AND ${generation.productAccuracyRating} IS NULL)::int`,
        notRatedCount: sql<number>`COUNT(*) FILTER (WHERE ${generation.id} IS NOT NULL AND ${generation.sceneAccuracyRating} IS NULL AND ${generation.productAccuracyRating} IS NULL)::int`,
        avgExecTimeMs: sql<number | null>`ROUND(AVG(${strategyStepResult.executionTime})::numeric, 0)::int`,
      })
      .from(strategy)
      .leftJoin(strategyRun, eq(strategyRun.strategyId, strategy.id))
      .leftJoin(
        strategyStepResult,
        and(
          eq(strategyStepResult.strategyRunId, strategyRun.id),
          isNotNull(strategyStepResult.generationId),
        ),
      )
      .leftJoin(generation, eq(generation.id, strategyStepResult.generationId))
      .where(and(...conditions))
      .groupBy(strategy.id, strategy.name, strategy.model);

    const data = rows.map((r) => {
      const total = Number(r.generationCount ?? 0);
      const sceneGood = Number(r.sceneGoodCount ?? 0);
      const sceneFailed = Number(r.sceneFailedCount ?? 0);
      const sceneRated = sceneGood + sceneFailed;
      const productGood = Number(r.productGoodCount ?? 0);
      const productFailed = Number(r.productFailedCount ?? 0);
      const productRated = productGood + productFailed;
      return {
        id: r.id,
        name: r.name,
        model: r.model,
        generationCount: total,
        sceneRatedCount: sceneRated,
        sceneGoodPct: pct(sceneGood, sceneRated),
        sceneFailedPct: pct(sceneFailed, sceneRated),
        productRatedCount: productRated,
        productGoodPct: pct(productGood, productRated),
        productFailedPct: pct(productFailed, productRated),
        notRatedCount: Number(r.notRatedCount ?? 0),
        notRatedPct: pct(Number(r.notRatedCount ?? 0), total),
        avgExecTimeMs: r.avgExecTimeMs != null ? Number(r.avgExecTimeMs) : null,
      };
    });

    const models = [...new Set(rows.map((r) => r.model))].sort();

    return successResponse({ rows: data, models });
  } catch (error) {
    console.error('Error fetching strategy performance:', error);
    throw error;
  }
}
