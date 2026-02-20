import { db } from '@/db/V1';
import { generationResult } from '@/db/V1/schema';
import { errorResponse } from '@/lib/api-response';
import { uuidSchema } from '@/lib/validation';
import { eq } from 'drizzle-orm';
import { NextRequest } from 'next/server';

type RouteParams = { params: Promise<{ id: string }> };

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    if (!uuidSchema.safeParse(id).success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid ID format');
    }

    const [deleted] = await db
      .delete(generationResult)
      .where(eq(generationResult.id, id))
      .returning();

    if (!deleted) {
      return errorResponse('NOT_FOUND', 'Image not found');
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting image:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to delete image');
  }
}
