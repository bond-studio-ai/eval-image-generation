import { db } from '@/db';
import { generation } from '@/db/schema';
import { errorResponse, successResponse } from '@/lib/api-response';
import { and, gte, lte, sql } from 'drizzle-orm';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const interval = params.get('interval') || 'day';
    const from =
      params.get('from') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const to = params.get('to') || new Date().toISOString();

    if (!['hour', 'day', 'week', 'month'].includes(interval)) {
      return errorResponse('VALIDATION_ERROR', 'Invalid interval. Use hour, day, week, or month.');
    }

    const conditions = [
      gte(generation.createdAt, new Date(from)),
      lte(generation.createdAt, new Date(to)),
    ];

    const ratingMap = sql`CASE result_rating
      WHEN 'FAILED' THEN 0
      WHEN 'POOR' THEN 1
      WHEN 'ACCEPTABLE' THEN 2
      WHEN 'GOOD' THEN 3
      WHEN 'EXCELLENT' THEN 4
    END`;

    const truncExpr = sql`date_trunc(${interval}, ${generation.createdAt})`;

    const data = await db
      .select({
        period: truncExpr,
        generationCount: sql<number>`COUNT(*)`,
        avgRatingScore: sql<number>`ROUND(AVG(${ratingMap})::numeric, 2)`,
        excellentCount: sql<number>`COUNT(*) FILTER (WHERE ${generation.resultRating} = 'EXCELLENT')`,
        failedCount: sql<number>`COUNT(*) FILTER (WHERE ${generation.resultRating} = 'FAILED')`,
      })
      .from(generation)
      .where(and(...conditions))
      .groupBy(truncExpr)
      .orderBy(truncExpr);

    return successResponse(
      data.map((row) => ({
        period: row.period,
        generation_count: row.generationCount,
        avg_rating_score: row.avgRatingScore ?? null,
        excellent_count: row.excellentCount,
        failed_count: row.failedCount,
      })),
    );
  } catch (error) {
    console.error('Error getting trends:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to get trends');
  }
}
