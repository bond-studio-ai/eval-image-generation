import { db } from '@/db/V1';
import { generation } from '@/db/V1/schema';
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
        allowed: ['FAILED', 'GOOD'],
        fields: ['scene_accuracy_rating', 'product_accuracy_rating'],
      });
    }

    const updates: Record<string, string> = {};
    if (parsed.data.scene_accuracy_rating !== undefined) {
      updates.sceneAccuracyRating = parsed.data.scene_accuracy_rating;
    }
    if (parsed.data.product_accuracy_rating !== undefined) {
      updates.productAccuracyRating = parsed.data.product_accuracy_rating;
    }

    const [updated] = await db
      .update(generation)
      .set(updates)
      .where(eq(generation.id, id))
      .returning();

    if (!updated) {
      return errorResponse('NOT_FOUND', 'Generation not found');
    }

    return successResponse({
      id: updated.id,
      scene_accuracy_rating: updated.sceneAccuracyRating,
      product_accuracy_rating: updated.productAccuracyRating,
    });
  } catch (error) {
    console.error('Error rating generation:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to rate generation');
  }
}
