import { db } from '@/db';
import { strategy, strategyStep } from '@/db/schema';
import { errorResponse, successResponse } from '@/lib/api-response';
import { uuidSchema, strategyStepSchema, updateStrategySchema } from '@/lib/validation';
import { eq, inArray } from 'drizzle-orm';
import { NextRequest } from 'next/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!uuidSchema.safeParse(id).success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid strategy ID');
    }

    const result = await db.query.strategy.findFirst({
      where: eq(strategy.id, id),
      with: {
        steps: {
          orderBy: [strategyStep.stepOrder],
          with: {
            promptVersion: { columns: { id: true, name: true } },
          },
        },
        runs: {
          columns: { id: true, status: true, createdAt: true, completedAt: true },
          orderBy: (r, { desc }) => [desc(r.createdAt)],
        },
      },
    });

    if (!result) {
      return errorResponse('NOT_FOUND', 'Strategy not found');
    }

    return successResponse(result);
  } catch (error) {
    console.error('Error fetching strategy:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch strategy');
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!uuidSchema.safeParse(id).success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid strategy ID');
    }

    const existing = await db.query.strategy.findFirst({
      where: eq(strategy.id, id),
    });

    if (!existing) {
      return errorResponse('NOT_FOUND', 'Strategy not found');
    }

    const body = await request.json();
    const parsed = updateStrategySchema.safeParse(body);
    const updates: Record<string, unknown> = {};
    if (parsed.success) {
      const p = parsed.data;
      if (p.name !== undefined) updates.name = p.name;
      if (p.description !== undefined) updates.description = p.description;
      if (p.model !== undefined) updates.model = p.model;
      if (p.aspect_ratio !== undefined) updates.aspectRatio = p.aspect_ratio;
      if (p.output_resolution !== undefined) updates.outputResolution = p.output_resolution;
      if (p.temperature !== undefined) updates.temperature = String(p.temperature);
      if (p.use_google_search !== undefined) updates.useGoogleSearch = p.use_google_search;
      if (p.tag_images !== undefined) updates.tagImages = p.tag_images;
    } else {
      if (typeof body.name === 'string') updates.name = body.name;
      if (typeof body.description === 'string' || body.description === null) updates.description = body.description;
    }

    if (Object.keys(updates).length > 0) {
      await db.update(strategy).set(updates).where(eq(strategy.id, id));
    }

    if (Array.isArray(body.steps)) {
      const parsed = strategyStepSchema.array().safeParse(body.steps);
      if (!parsed.success) {
        return errorResponse('VALIDATION_ERROR', 'Invalid steps', {
          issues: parsed.error.flatten().fieldErrors,
        });
      }

      const existingSteps = await db.query.strategyStep.findMany({
        where: eq(strategyStep.strategyId, id),
      });
      const existingIds = new Set(existingSteps.map((s) => s.id));

      const incomingWithId = parsed.data.filter((s) => s.id && existingIds.has(s.id));
      const incomingNew = parsed.data.filter((s) => !s.id || !existingIds.has(s.id));
      const keptIds = new Set(incomingWithId.map((s) => s.id!));
      const removedIds = [...existingIds].filter((eid) => !keptIds.has(eid));

      const stepValues = (s: (typeof parsed.data)[number]) => ({
        stepOrder: s.step_order,
        name: s.name ?? null,
        promptVersionId: s.prompt_version_id,
        model: s.model,
        aspectRatio: s.aspect_ratio,
        outputResolution: s.output_resolution,
        temperature: String(s.temperature),
        useGoogleSearch: s.use_google_search,
        tagImages: s.tag_images,
        dollhouseViewFromStep: s.dollhouse_view_from_step ?? null,
        realPhotoFromStep: s.real_photo_from_step ?? null,
        moodBoardFromStep: s.mood_board_from_step ?? null,
        includeDollhouse: s.include_dollhouse ?? true,
        includeRealPhoto: s.include_real_photo ?? true,
        includeMoodBoard: s.include_mood_board ?? true,
        includeProductCategories: s.include_product_categories ?? [],
        arbitraryImageFromStep: s.arbitrary_image_from_step ?? null,
      });

      for (const s of incomingWithId) {
        await db.update(strategyStep).set(stepValues(s)).where(eq(strategyStep.id, s.id!));
      }

      if (incomingNew.length > 0) {
        await db.insert(strategyStep).values(
          incomingNew.map((s) => ({ strategyId: id, ...stepValues(s) })),
        );
      }

      if (removedIds.length > 0) {
        await db.delete(strategyStep).where(inArray(strategyStep.id, removedIds));
      }
    }

    const updated = await db.query.strategy.findFirst({
      where: eq(strategy.id, id),
      with: {
        steps: {
          orderBy: [strategyStep.stepOrder],
          with: {
            promptVersion: { columns: { id: true, name: true } },
          },
        },
      },
    });

    return successResponse(updated);
  } catch (error) {
    console.error('Error updating strategy:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to update strategy');
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!uuidSchema.safeParse(id).success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid strategy ID');
    }

    const [updated] = await db
      .update(strategy)
      .set({ deletedAt: new Date() })
      .where(eq(strategy.id, id))
      .returning();

    if (!updated) {
      return errorResponse('NOT_FOUND', 'Strategy not found');
    }

    return successResponse({ id: updated.id, deleted: true });
  } catch (error) {
    console.error('Error deleting strategy:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to delete strategy');
  }
}
