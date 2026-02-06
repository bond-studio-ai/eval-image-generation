import { db } from '@/db';
import { generation, generationResult } from '@/db/schema';
import { errorResponse, successResponse } from '@/lib/api-response';
import { addImageSchema, uuidSchema } from '@/lib/validation';
import { eq } from 'drizzle-orm';
import { NextRequest } from 'next/server';

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    if (!uuidSchema.safeParse(id).success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid ID format');
    }

    // Verify generation exists
    const gen = await db.query.generation.findFirst({
      where: eq(generation.id, id),
    });

    if (!gen) {
      return errorResponse('NOT_FOUND', 'Generation not found');
    }

    const body = await request.json();
    const parsed = addImageSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid request body', {
        issues: parsed.error.flatten().fieldErrors,
      });
    }

    const [created] = await db
      .insert(generationResult)
      .values({
        generationId: id,
        url: parsed.data.url,
      })
      .returning();

    return successResponse(created, 201);
  } catch (error) {
    console.error('Error adding output image:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to add output image');
  }
}
