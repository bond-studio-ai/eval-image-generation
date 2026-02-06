import { db } from '@/db';
import { generation, promptVersion } from '@/db/schema';
import { errorResponse, successResponse } from '@/lib/api-response';
import { updatePromptVersionSchema, uuidSchema } from '@/lib/validation';
import { count, eq } from 'drizzle-orm';
import { NextRequest } from 'next/server';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    if (!uuidSchema.safeParse(id).success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid ID format');
    }

    const result = await db.query.promptVersion.findFirst({
      where: eq(promptVersion.id, id),
      with: {
        generations: {
          columns: { id: true, resultRating: true },
        },
      },
    });

    if (!result) {
      return errorResponse('NOT_FOUND', 'Prompt version not found');
    }

    const ratings = result.generations;
    const rated = ratings.filter((g) => g.resultRating !== null);
    const ratingMap = { FAILED: 0, POOR: 1, ACCEPTABLE: 2, GOOD: 3, EXCELLENT: 4 };

    const distribution: Record<string, number> = {
      EXCELLENT: 0,
      GOOD: 0,
      ACCEPTABLE: 0,
      POOR: 0,
      FAILED: 0,
    };
    let ratingSum = 0;

    for (const g of rated) {
      if (g.resultRating) {
        distribution[g.resultRating]++;
        ratingSum += ratingMap[g.resultRating];
      }
    }

    const { generations: _, ...pvData } = result;

    return successResponse({
      ...pvData,
      stats: {
        generation_count: ratings.length,
        rated_count: rated.length,
        avg_rating_score:
          rated.length > 0 ? Math.round((ratingSum / rated.length) * 100) / 100 : null,
        rating_distribution: distribution,
      },
    });
  } catch (error) {
    console.error('Error getting prompt version:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to get prompt version');
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    if (!uuidSchema.safeParse(id).success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid ID format');
    }

    // Check if version has generations — if so, it's locked
    const genCount = await db
      .select({ count: count() })
      .from(generation)
      .where(eq(generation.promptVersionId, id));

    if ((genCount[0]?.count ?? 0) > 0) {
      return errorResponse('FORBIDDEN', 'Cannot edit a prompt version that has been used in generations');
    }

    const body = await request.json();
    const parsed = updatePromptVersionSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid request body', {
        issues: parsed.error.flatten().fieldErrors,
      });
    }

    const updates: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) updates.name = parsed.data.name;
    if (parsed.data.description !== undefined) updates.description = parsed.data.description;
    if (parsed.data.system_prompt !== undefined) updates.systemPrompt = parsed.data.system_prompt;
    if (parsed.data.user_prompt !== undefined) updates.userPrompt = parsed.data.user_prompt;
    if (parsed.data.model !== undefined) updates.model = parsed.data.model;
    if (parsed.data.output_type !== undefined) updates.outputType = parsed.data.output_type;
    if (parsed.data.aspect_ratio !== undefined) updates.aspectRatio = parsed.data.aspect_ratio;
    if (parsed.data.output_resolution !== undefined) updates.outputResolution = parsed.data.output_resolution;
    if (parsed.data.temperature !== undefined)
      updates.temperature = parsed.data.temperature !== null ? String(parsed.data.temperature) : null;

    if (Object.keys(updates).length === 0) {
      return errorResponse('VALIDATION_ERROR', 'No fields to update');
    }

    const [updated] = await db
      .update(promptVersion)
      .set(updates)
      .where(eq(promptVersion.id, id))
      .returning();

    if (!updated) {
      return errorResponse('NOT_FOUND', 'Prompt version not found');
    }

    return successResponse(updated);
  } catch (error) {
    console.error('Error updating prompt version:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to update prompt version');
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    if (!uuidSchema.safeParse(id).success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid ID format');
    }

    // Check if version has generations — if so, it cannot be deleted
    const genCount = await db
      .select({ count: count() })
      .from(generation)
      .where(eq(generation.promptVersionId, id));

    if ((genCount[0]?.count ?? 0) > 0) {
      return errorResponse('FORBIDDEN', 'Cannot delete a prompt version that has been used in generations');
    }

    // Hard delete (no generations reference this version)
    const [deleted] = await db
      .delete(promptVersion)
      .where(eq(promptVersion.id, id))
      .returning();

    if (!deleted) {
      return errorResponse('NOT_FOUND', 'Prompt version not found');
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting prompt version:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to delete prompt version');
  }
}
