import { db } from '@/db';
import { inputPreset } from '@/db/schema';
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

    const updated = await db
      .update(inputPreset)
      .set({ deletedAt: new Date() })
      .where(inArray(inputPreset.id, parsed.data.ids))
      .returning({ id: inputPreset.id });

    return successResponse({ deleted: updated.length });
  } catch (error) {
    console.error('Error bulk deleting input presets:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to delete input presets');
  }
}
