import { db } from '@/db';
import { generation, generationResult } from '@/db/schema';
import { successResponse, errorResponse } from '@/lib/api-response';
import { desc, eq } from 'drizzle-orm';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const limit = Math.min(
      Math.max(parseInt(request.nextUrl.searchParams.get('limit') ?? '50', 10) || 50, 1),
      200,
    );

    const rows = await db
      .select({
        id: generationResult.id,
        url: generationResult.url,
        generationId: generationResult.generationId,
        createdAt: generation.createdAt,
      })
      .from(generationResult)
      .innerJoin(generation, eq(generationResult.generationId, generation.id))
      .orderBy(desc(generation.createdAt))
      .limit(limit);

    return successResponse(rows);
  } catch (error) {
    console.error('Error listing generation outputs:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to list generation outputs');
  }
}
