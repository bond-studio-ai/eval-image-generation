import { db } from '@/db';
import { generation, strategy, strategyRun, strategyStepResult } from '@/db/schema';
import { successResponse } from '@/lib/api-response';
import { and, eq, isNotNull, isNull, sql } from 'drizzle-orm';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

/** GET: list strategies with generation count, good/bad/not-rated %, avg exec time for analytics. */
export async function GET(_request: NextRequest) {
  try {
    const rows = await db
      .select({
        id: strategy.id,
        name: strategy.name,
        generationCount: sql<number>`COUNT(${generation.id})::int`,
        goodCount: sql<number>`COUNT(*) FILTER (WHERE ${generation.sceneAccuracyRating} = 'GOOD' OR ${generation.productAccuracyRating} = 'GOOD')::int`,
        badCount: sql<number>`COUNT(*) FILTER (WHERE ${generation.sceneAccuracyRating} = 'FAILED' OR ${generation.productAccuracyRating} = 'FAILED')::int`,
        notRatedCount: sql<number>`COUNT(*) FILTER (WHERE ${generation.sceneAccuracyRating} IS NULL AND ${generation.productAccuracyRating} IS NULL)::int`,
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
      const good = Number(r.goodCount ?? 0);
      const bad = Number(r.badCount ?? 0);
      const notRated = Number(r.notRatedCount ?? 0);
      return {
        id: r.id,
        name: r.name,
        generationCount: total,
        goodPct: total > 0 ? Math.round((good / total) * 10000) / 100 : 0,
        badPct: total > 0 ? Math.round((bad / total) * 10000) / 100 : 0,
        notRatedPct: total > 0 ? Math.round((notRated / total) * 10000) / 100 : 0,
        avgExecTimeMs: r.avgExecTimeMs != null ? Number(r.avgExecTimeMs) : null,
      };
    });

    return successResponse(data);
  } catch (error) {
    console.error('Error fetching strategy performance:', error);
    throw error;
  }
}
