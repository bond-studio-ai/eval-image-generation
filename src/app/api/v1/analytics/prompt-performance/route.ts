import { db } from '@/db';
import { generation, promptVersion } from '@/db/schema';
import { errorResponse, successResponse } from '@/lib/api-response';
import { and, count, eq, gte, isNull, lte, sql } from 'drizzle-orm';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const from = params.get('from');
    const to = params.get('to');
    const limit = parseInt(params.get('limit') || '10', 10);

    const conditions = [isNull(promptVersion.deletedAt)];
    if (from) {
      conditions.push(gte(generation.createdAt, new Date(from)));
    }
    if (to) {
      conditions.push(lte(generation.createdAt, new Date(to)));
    }

    const ratingMap = sql`CASE scene_accuracy_rating
      WHEN 'FAILED' THEN 0
      WHEN 'GOOD' THEN 1
    END`;

    const query = db
      .select({
        promptVersionId: promptVersion.id,
        promptName: promptVersion.name,
        generationCount: count(generation.id),
        ratedCount: sql<number>`COUNT(${generation.id}) FILTER (WHERE ${generation.sceneAccuracyRating} IS NOT NULL)`,
        avgRatingScore: sql<number>`ROUND(AVG(${ratingMap})::numeric, 2)`,
        goodRate: sql<number>`ROUND(
          COUNT(${generation.id}) FILTER (WHERE ${generation.sceneAccuracyRating} = 'GOOD')::numeric
          / NULLIF(COUNT(${generation.id}) FILTER (WHERE ${generation.sceneAccuracyRating} IS NOT NULL), 0),
          2
        )`,
        failureRate: sql<number>`ROUND(
          COUNT(${generation.id}) FILTER (WHERE ${generation.sceneAccuracyRating} = 'FAILED')::numeric
          / NULLIF(COUNT(${generation.id}) FILTER (WHERE ${generation.sceneAccuracyRating} IS NOT NULL), 0),
          2
        )`,
      })
      .from(promptVersion)
      .leftJoin(generation, eq(generation.promptVersionId, promptVersion.id))
      .where(and(...conditions))
      .groupBy(promptVersion.id)
      .orderBy(sql`AVG(${ratingMap}) DESC NULLS LAST`)
      .limit(limit);

    const data = await query;

    return successResponse(
      data.map((row) => ({
        prompt_version_id: row.promptVersionId,
        prompt_name: row.promptName,
        generation_count: row.generationCount,
        rated_count: row.ratedCount ?? 0,
        avg_rating_score: row.avgRatingScore ?? null,
        good_rate: row.goodRate ?? 0,
        failure_rate: row.failureRate ?? 0,
      })),
    );
  } catch (error) {
    console.error('Error getting prompt performance:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to get prompt performance');
  }
}
