import { db } from '@/db';
import { strategyRun, strategyStepResult } from '@/db/schema';
import { errorResponse, successResponse } from '@/lib/api-response';
import { uuidSchema } from '@/lib/validation';
import { and, eq, sql } from 'drizzle-orm';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

/** GET ?strategy_id=...: error breakdown for a strategy (failed step results grouped by error text). */
export async function GET(request: NextRequest) {
  try {
    const strategyId = request.nextUrl.searchParams.get('strategy_id');
    if (!strategyId || !uuidSchema.safeParse(strategyId).success) {
      return errorResponse('VALIDATION_ERROR', 'Valid strategy_id is required');
    }

    // Normalize error: first 200 chars to group similar errors
    const results = await db
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
      .orderBy(sql`COUNT(*) DESC`);

    const data = results.map((r) => ({ reason: r.reason, count: r.count }));
    return successResponse(data);
  } catch (error) {
    console.error('Error fetching strategy errors:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch strategy error breakdown');
  }
}
