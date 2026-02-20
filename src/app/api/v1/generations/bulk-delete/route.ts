import { db } from '@/db';
import { generation } from '@/db/schema';
import { errorResponse, successResponse } from '@/lib/api-response';
import { uuidSchema } from '@/lib/validation';
import { inArray } from 'drizzle-orm';
import { NextRequest } from 'next/server';
import { z } from 'zod';

const schema = z.object({
  ids: z.array(uuidSchema).min(1).max(200),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid request body', {
        issues: parsed.error.flatten().fieldErrors,
      });
    }

    const deleted = await db
      .delete(generation)
      .where(inArray(generation.id, parsed.data.ids))
      .returning({ id: generation.id });

    return successResponse({ deleted: deleted.length });
  } catch (error) {
    console.error('Error bulk deleting generations:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to delete generations');
  }
}
