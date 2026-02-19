import { db } from '@/db';
import { generation, strategy } from '@/db/schema';
import { errorResponse, successResponse } from '@/lib/api-response';
import { uuidSchema } from '@/lib/validation';
import { count, eq } from 'drizzle-orm';
import { NextRequest } from 'next/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!uuidSchema.safeParse(id).success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid strategy ID');
    }

    const result = await db.query.strategy.findFirst({
      where: eq(strategy.id, id),
      with: {
        sourceResult: {
          columns: { url: true, generationId: true },
        },
      },
    });

    if (!result) {
      return errorResponse('NOT_FOUND', 'Strategy not found');
    }

    const stats = await db
      .select({ count: count() })
      .from(generation)
      .where(eq(generation.strategyId, id));

    return successResponse({
      ...result,
      imageUrl: result.sourceResult.url,
      sourceGenerationId: result.sourceResult.generationId,
      stats: {
        generation_count: stats[0]?.count ?? 0,
      },
    });
  } catch (error) {
    console.error('Error fetching strategy:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch strategy');
  }
}
