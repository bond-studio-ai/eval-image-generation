import { db } from '@/db';
import { generation } from '@/db/schema';
import { errorResponse, successResponse } from '@/lib/api-response';
import { rateGenerationSchema, uuidSchema } from '@/lib/validation';
import { eq } from 'drizzle-orm';
import { NextRequest } from 'next/server';

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    if (!uuidSchema.safeParse(id).success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid ID format');
    }

    const body = await request.json();
    const parsed = rateGenerationSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid rating value', {
        field: 'rating',
        allowed: ['FAILED', 'POOR', 'ACCEPTABLE', 'GOOD', 'EXCELLENT'],
      });
    }

    const [updated] = await db
      .update(generation)
      .set({ resultRating: parsed.data.rating })
      .where(eq(generation.id, id))
      .returning();

    if (!updated) {
      return errorResponse('NOT_FOUND', 'Generation not found');
    }

    return successResponse({
      id: updated.id,
      result_rating: updated.resultRating,
    });
  } catch (error) {
    console.error('Error rating generation:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to rate generation');
  }
}
