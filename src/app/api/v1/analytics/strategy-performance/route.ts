import { db } from '@/db';
import { generation, strategy, strategyRun, strategyStepResult } from '@/db/schema';
import { successResponse } from '@/lib/api-response';
import { and, eq, isNotNull, isNull, sql } from 'drizzle-orm';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

function pct(n: number, total: number) {
  return total > 0 ? Math.round((n / total) * 10000) / 100 : 0;
}

/** GET: list strategies with generation count, scene/product good/failed %, not-rated %, avg exec time. */
export async function GET(_request: NextRequest) {
  try {
    const rows = await db
      .select({
        id: strategy.id,
        name: strategy.name,
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
      .where(isNull(strategy.deletedAt))
      .groupBy(strategy.id, strategy.name);

    const data = rows.map((r) => {
      const total = Number(r.generationCount ?? 0);
      return {
        id: r.id,
        name: r.name,
        generationCount: total,
        sceneGoodPct: pct(Number(r.sceneGoodCount ?? 0), total),
        sceneFailedPct: pct(Number(r.sceneFailedCount ?? 0), total),
        sceneUnsetPct: pct(Number(r.sceneUnsetCount ?? 0), total),
        productGoodPct: pct(Number(r.productGoodCount ?? 0), total),
        productFailedPct: pct(Number(r.productFailedCount ?? 0), total),
        productUnsetPct: pct(Number(r.productUnsetCount ?? 0), total),
        notRatedPct: pct(Number(r.notRatedCount ?? 0), total),
        avgExecTimeMs: r.avgExecTimeMs != null ? Number(r.avgExecTimeMs) : null,
      };
    });

    return successResponse(data);
  } catch (error) {
    console.error('Error fetching strategy performance:', error);
    throw error;
  }
}
