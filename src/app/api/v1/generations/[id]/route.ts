import { db } from '@/db/V1';
import { generation } from '@/db/V1/schema';
import { errorResponse, successResponse } from '@/lib/api-response';
import { uuidSchema } from '@/lib/validation';
import { eq } from 'drizzle-orm';
import { NextRequest } from 'next/server';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    if (!uuidSchema.safeParse(id).success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid ID format');
    }

    const result = await db.query.generation.findFirst({
      where: eq(generation.id, id),
      with: {
        promptVersion: true,
        input: true,
        results: true,
      },
    });

    if (!result) {
      return errorResponse('NOT_FOUND', 'Generation not found');
    }

    return successResponse({
      id: result.id,
      prompt_version: result.promptVersion,
      scene_accuracy_rating: result.sceneAccuracyRating,
      product_accuracy_rating: result.productAccuracyRating,
      notes: result.notes,
      execution_time: result.executionTime,
      created_at: result.createdAt,
      input: result.input,
      results: result.results,
    });
  } catch (error) {
    console.error('Error getting generation:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to get generation');
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    if (!uuidSchema.safeParse(id).success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid ID format');
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if ('notes' in body) updates.notes = body.notes ?? null;

    if (Object.keys(updates).length === 0) {
      return errorResponse('VALIDATION_ERROR', 'No valid fields to update');
    }

    const [updated] = await db
      .update(generation)
      .set(updates)
      .where(eq(generation.id, id))
      .returning();

    if (!updated) {
      return errorResponse('NOT_FOUND', 'Generation not found');
    }

    return successResponse({ id: updated.id, notes: updated.notes });
  } catch (error) {
    console.error('Error updating generation:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to update generation');
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    if (!uuidSchema.safeParse(id).success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid ID format');
    }

    // Cascade delete will handle related rows
    const [deleted] = await db.delete(generation).where(eq(generation.id, id)).returning();

    if (!deleted) {
      return errorResponse('NOT_FOUND', 'Generation not found');
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting generation:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to delete generation');
  }
}
