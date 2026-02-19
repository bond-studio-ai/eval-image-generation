import { db } from '@/db';
import { generation, generationResult, strategy } from '@/db/schema';
import { errorResponse, paginatedResponse, successResponse } from '@/lib/api-response';
import { createStrategySchema, listStrategiesSchema } from '@/lib/validation';
import { and, asc, count, desc, eq, isNull } from 'drizzle-orm';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const params = Object.fromEntries(request.nextUrl.searchParams);
    const parsed = listStrategiesSchema.safeParse(params);

    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid query parameters', {
        issues: parsed.error.flatten().fieldErrors,
      });
    }

    const { page, limit, include_deleted, sort, order } = parsed.data;
    const offset = (page - 1) * limit;

    const conditions = include_deleted ? [] : [isNull(strategy.deletedAt)];

    const orderBy =
      sort === 'name'
        ? order === 'asc'
          ? asc(strategy.name)
          : desc(strategy.name)
        : order === 'asc'
          ? asc(strategy.createdAt)
          : desc(strategy.createdAt);

    const [rows, totalResult] = await Promise.all([
      db.query.strategy.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        orderBy: [orderBy],
        limit,
        offset,
        with: {
          sourceResult: {
            columns: { url: true },
          },
        },
      }),
      db
        .select({ count: count() })
        .from(strategy)
        .where(conditions.length > 0 ? and(...conditions) : undefined),
    ]);

    const total = totalResult[0]?.count ?? 0;

    const data = await Promise.all(
      rows.map(async (s) => {
        const stats = await db
          .select({ count: count() })
          .from(generation)
          .where(eq(generation.strategyId, s.id));

        return {
          ...s,
          imageUrl: s.sourceResult.url,
          stats: {
            generation_count: stats[0]?.count ?? 0,
          },
        };
      }),
    );

    return paginatedResponse(data, { page, limit, total });
  } catch (error) {
    console.error('Error listing strategies:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to list strategies');
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createStrategySchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid request body', {
        issues: parsed.error.flatten().fieldErrors,
      });
    }

    const { name, description, source_result_id } = parsed.data;

    // Verify the source result exists
    const sourceResult = await db.query.generationResult.findFirst({
      where: eq(generationResult.id, source_result_id),
    });

    if (!sourceResult) {
      return errorResponse('NOT_FOUND', 'Source generation result not found');
    }

    const [created] = await db
      .insert(strategy)
      .values({
        name,
        description: description ?? null,
        sourceResultId: source_result_id,
      })
      .returning();

    return successResponse({ ...created, imageUrl: sourceResult.url }, 201);
  } catch (error) {
    console.error('Error creating strategy:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to create strategy');
  }
}
