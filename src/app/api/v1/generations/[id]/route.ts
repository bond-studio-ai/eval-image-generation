import { db } from '@/db';
import { generation } from '@/db/schema';
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
        inputImages: true,
        outputImages: true,
      },
    });

    if (!result) {
      return errorResponse('NOT_FOUND', 'Generation not found');
    }

    return successResponse({
      id: result.id,
      prompt_version: result.promptVersion,
      result_rating: result.resultRating,
      notes: result.notes,
      execution_time: result.executionTime,
      created_at: result.createdAt,
      input_images: result.inputImages,
      output_images: result.outputImages,
    });
  } catch (error) {
    console.error('Error getting generation:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to get generation');
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    if (!uuidSchema.safeParse(id).success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid ID format');
    }

    // Cascade delete will handle images
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
