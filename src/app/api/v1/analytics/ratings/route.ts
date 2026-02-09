import { db } from '@/db';
import { generation } from '@/db/schema';
import { errorResponse, successResponse } from '@/lib/api-response';
import { and, count, eq, gte, isNotNull, lte } from 'drizzle-orm';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const promptVersionId = params.get('prompt_version_id');
    const from = params.get('from');
    const to = params.get('to');

    const conditions = [isNotNull(generation.resultRating)];
    if (promptVersionId) {
      conditions.push(eq(generation.promptVersionId, promptVersionId));
    }
    if (from) {
      conditions.push(gte(generation.createdAt, new Date(from)));
    }
    if (to) {
      conditions.push(lte(generation.createdAt, new Date(to)));
    }

    const whereClause = and(...conditions);

    const [totalResult, distributionResult] = await Promise.all([
      db.select({ count: count() }).from(generation).where(whereClause),
      db
        .select({
          rating: generation.resultRating,
          count: count(),
        })
        .from(generation)
        .where(whereClause)
        .groupBy(generation.resultRating),
    ]);

    const totalRated = totalResult[0]?.count ?? 0;

    // Get total generations (including unrated)
    const unratedConditions = [];
    if (promptVersionId) {
      unratedConditions.push(eq(generation.promptVersionId, promptVersionId));
    }
    if (from) {
      unratedConditions.push(gte(generation.createdAt, new Date(from)));
    }
    if (to) {
      unratedConditions.push(lte(generation.createdAt, new Date(to)));
    }

    const totalGenerationsResult = await db
      .select({ count: count() })
      .from(generation)
      .where(unratedConditions.length > 0 ? and(...unratedConditions) : undefined);

    const totalGenerations = totalGenerationsResult[0]?.count ?? 0;

    const ratingOrder = ['GOOD', 'FAILED'];
    const distribution = ratingOrder.map((rating) => {
      const entry = distributionResult.find((r) => r.rating === rating);
      const ratingCount = entry?.count ?? 0;
      return {
        rating,
        count: ratingCount,
        percentage: totalRated > 0 ? Math.round((ratingCount / totalRated) * 10000) / 100 : 0,
      };
    });

    return successResponse({
      total_generations: totalGenerations,
      rated_generations: totalRated,
      distribution,
    });
  } catch (error) {
    console.error('Error getting rating distribution:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to get rating distribution');
  }
}
