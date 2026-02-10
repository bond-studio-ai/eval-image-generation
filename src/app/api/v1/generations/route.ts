import { db } from '@/db';
import {
  generation,
  generationInput,
  generationResult,
  promptVersion,
} from '@/db/schema';
import { errorResponse, paginatedResponse, successResponse } from '@/lib/api-response';
import { createGenerationSchema, listGenerationsSchema } from '@/lib/validation';
import { and, asc, count, desc, eq, gte, inArray, isNull, lte } from 'drizzle-orm';
import { NextRequest } from 'next/server';

/** Map from snake_case input keys to camelCase schema fields */
const INPUT_KEY_MAP: Record<string, string> = {
  dollhouse_view: 'dollhouseView',
  real_photo: 'realPhoto',
  mood_board: 'moodBoard',
  faucets: 'faucets',
  lightings: 'lightings',
  lvps: 'lvps',
  mirrors: 'mirrors',
  paints: 'paints',
  robe_hooks: 'robeHooks',
  shelves: 'shelves',
  shower_glasses: 'showerGlasses',
  shower_systems: 'showerSystems',
  floor_tiles: 'floorTiles',
  wall_tiles: 'wallTiles',
  shower_wall_tiles: 'showerWallTiles',
  shower_floor_tiles: 'showerFloorTiles',
  shower_curb_tiles: 'showerCurbTiles',
  toilet_paper_holders: 'toiletPaperHolders',
  toilets: 'toilets',
  towel_bars: 'towelBars',
  towel_rings: 'towelRings',
  tub_doors: 'tubDoors',
  tub_fillers: 'tubFillers',
  tubs: 'tubs',
  vanities: 'vanities',
  wallpapers: 'wallpapers',
};

export async function GET(request: NextRequest) {
  try {
    const params = Object.fromEntries(request.nextUrl.searchParams);
    const parsed = listGenerationsSchema.safeParse(params);

    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid query parameters', {
        issues: parsed.error.flatten().fieldErrors,
      });
    }

    const { page, limit, prompt_version_id, scene_accuracy_rating, product_accuracy_rating, unrated, from, to, sort, order } = parsed.data;
    const offset = (page - 1) * limit;

    const conditions = [];
    if (prompt_version_id) {
      conditions.push(eq(generation.promptVersionId, prompt_version_id));
    }
    if (scene_accuracy_rating) {
      conditions.push(eq(generation.sceneAccuracyRating, scene_accuracy_rating));
    }
    if (product_accuracy_rating) {
      conditions.push(eq(generation.productAccuracyRating, product_accuracy_rating));
    }
    if (unrated) {
      conditions.push(and(isNull(generation.sceneAccuracyRating), isNull(generation.productAccuracyRating)));
    }
    if (from) {
      conditions.push(gte(generation.createdAt, new Date(from)));
    }
    if (to) {
      conditions.push(lte(generation.createdAt, new Date(to)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const orderBy =
      order === 'asc'
        ? asc(generation.createdAt)
        : desc(generation.createdAt);

    const [rows, totalResult] = await Promise.all([
      db
        .select({
          id: generation.id,
          promptVersionId: generation.promptVersionId,
          promptName: promptVersion.name,
          promptPreview: promptVersion.userPrompt,
          sceneAccuracyRating: generation.sceneAccuracyRating,
          productAccuracyRating: generation.productAccuracyRating,
          notes: generation.notes,
          executionTime: generation.executionTime,
          createdAt: generation.createdAt,
        })
        .from(generation)
        .innerJoin(promptVersion, eq(promptVersion.id, generation.promptVersionId))
        .where(whereClause)
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset),
      db.select({ count: count() }).from(generation).where(whereClause),
    ]);

    const total = totalResult[0]?.count ?? 0;

    // Batch-fetch result URLs for all generations in a single query
    const genIds = rows.map((r) => r.id);
    const allResults = genIds.length > 0
      ? await db
          .select({
            generationId: generationResult.generationId,
            url: generationResult.url,
          })
          .from(generationResult)
          .where(inArray(generationResult.generationId, genIds))
      : [];

    const resultsByGenId = new Map<string, string[]>();
    for (const r of allResults) {
      const list = resultsByGenId.get(r.generationId) ?? [];
      list.push(r.url);
      resultsByGenId.set(r.generationId, list);
    }

    const data = rows.map((row) => {
      const urls = resultsByGenId.get(row.id) ?? [];
      return {
        ...row,
        prompt_preview:
          row.promptPreview && row.promptPreview.length > 100
            ? row.promptPreview.slice(0, 100) + '...'
            : row.promptPreview,
        result_urls: urls,
        result_count: urls.length,
      };
    });

    return paginatedResponse(data, { page, limit, total });
  } catch (error) {
    console.error('Error listing generations:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to list generations');
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createGenerationSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid request body', {
        issues: parsed.error.flatten().fieldErrors,
      });
    }

    const { prompt_version_id, input_images, output_images, notes, execution_time } = parsed.data;

    // Verify prompt version exists
    const pv = await db.query.promptVersion.findFirst({
      where: eq(promptVersion.id, prompt_version_id),
    });

    if (!pv) {
      return errorResponse('NOT_FOUND', 'Prompt version not found');
    }

    // Create generation
    const [created] = await db
      .insert(generation)
      .values({
        promptVersionId: prompt_version_id,
        notes: notes ?? null,
        executionTime: execution_time ?? null,
      })
      .returning();

    // Insert generation_input row (structured)
    if (input_images) {
      const inputValues: Record<string, unknown> = { generationId: created.id };
      for (const [snakeKey, camelKey] of Object.entries(INPUT_KEY_MAP)) {
        const val = (input_images as Record<string, string | null | undefined>)[snakeKey];
        if (val) inputValues[camelKey] = val;
      }
      await db.insert(generationInput).values(inputValues as typeof generationInput.$inferInsert);
    }

    // Insert output results
    if (output_images && output_images.length > 0) {
      await db.insert(generationResult).values(
        output_images.map((img) => ({
          generationId: created.id,
          url: img.url,
        })),
      );
    }

    return successResponse(created, 201);
  } catch (error) {
    console.error('Error creating generation:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to create generation');
  }
}
