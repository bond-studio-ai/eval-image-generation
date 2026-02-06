import { db } from '@/db';
import { generationImageInput, generationImageOutput } from '@/db/schema';
import { errorResponse } from '@/lib/api-response';
import { uuidSchema } from '@/lib/validation';
import { eq } from 'drizzle-orm';
import { NextRequest } from 'next/server';

type RouteParams = { params: Promise<{ id: string }> };

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    if (!uuidSchema.safeParse(id).success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid ID format');
    }

    const type = request.nextUrl.searchParams.get('type');

    if (!type || !['input', 'output'].includes(type)) {
      return errorResponse(
        'VALIDATION_ERROR',
        'Query parameter "type" is required (input or output)',
      );
    }

    let deleted;

    if (type === 'input') {
      [deleted] = await db
        .delete(generationImageInput)
        .where(eq(generationImageInput.id, id))
        .returning();
    } else {
      [deleted] = await db
        .delete(generationImageOutput)
        .where(eq(generationImageOutput.id, id))
        .returning();
    }

    if (!deleted) {
      return errorResponse('NOT_FOUND', 'Image not found');
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting image:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to delete image');
  }
}
