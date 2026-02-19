import { db } from '@/db';
import { generation, inputPreset } from '@/db/schema';
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
      return errorResponse('VALIDATION_ERROR', 'Invalid preset ID');
    }

    const result = await db.query.inputPreset.findFirst({
      where: eq(inputPreset.id, id),
    });

    if (!result) {
      return errorResponse('NOT_FOUND', 'Input preset not found');
    }

    const stats = await db
      .select({ count: count() })
      .from(generation)
      .where(eq(generation.inputPresetId, id));

    return successResponse({
      ...result,
      stats: {
        generation_count: stats[0]?.count ?? 0,
      },
    });
  } catch (error) {
    console.error('Error fetching input preset:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch input preset');
  }
}
