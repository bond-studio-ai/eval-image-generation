import { db } from '@/db';
import { strategy, strategyRun, strategyStep } from '@/db/schema';
import { errorResponse, paginatedResponse, successResponse } from '@/lib/api-response';
import { createStrategySchema, listStrategiesSchema, strategyStepSchema } from '@/lib/validation';
import { and, asc, count, desc, eq, isNull } from 'drizzle-orm';
import { NextRequest } from 'next/server';
import { z } from 'zod';

export async function GET(request: NextRequest) {
  try {
    const params = Object.fromEntries(request.nextUrl.searchParams);
    const parsed = listStrategiesSchema.safeParse(params);

    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid query parameters', {
        issues: parsed.error.flatten().fieldErrors,
      });
    }

    const { page, limit, include_deleted, sort, order } = parsed.data;
    const offset = (page - 1) * limit;

    const conditions = include_deleted ? [] : [isNull(strategy.deletedAt)];

    const orderBy =
      sort === 'name'
        ? order === 'asc'
          ? asc(strategy.name)
          : desc(strategy.name)
        : order === 'asc'
          ? asc(strategy.createdAt)
          : desc(strategy.createdAt);

    const [rows, totalResult] = await Promise.all([
      db
        .select()
        .from(strategy)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(strategy)
        .where(conditions.length > 0 ? and(...conditions) : undefined),
    ]);

    const total = totalResult[0]?.count ?? 0;

    const data = await Promise.all(
      rows.map(async (s) => {
        const [stepCount, runCount] = await Promise.all([
          db.select({ count: count() }).from(strategyStep).where(eq(strategyStep.strategyId, s.id)),
          db.select({ count: count() }).from(strategyRun).where(eq(strategyRun.strategyId, s.id)),
        ]);

        return {
          ...s,
          stepCount: stepCount[0]?.count ?? 0,
          runCount: runCount[0]?.count ?? 0,
        };
      }),
    );

    return paginatedResponse(data, { page, limit, total });
  } catch (error) {
    console.error('Error listing strategies:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to list strategies');
  }
}

const createWithStepsSchema = createStrategySchema.extend({
  steps: z.array(strategyStepSchema).min(1, 'At least one step is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createWithStepsSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid request body', {
        issues: parsed.error.flatten().fieldErrors,
      });
    }

    const { name, description, steps } = parsed.data;

    const [created] = await db
      .insert(strategy)
      .values({
        name,
        description: description ?? null,
      })
      .returning();

    if (steps.length > 0) {
      await db.insert(strategyStep).values(
        steps.map((s) => ({
          strategyId: created.id,
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
        })),
      );
    }

    return successResponse({ ...created, stepCount: steps.length }, 201);
  } catch (error) {
    console.error('Error creating strategy:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to create strategy');
  }
}
