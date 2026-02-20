import { db } from '@/db/V1';
import { generation, generationInput } from '@/db/V1/schema';
import { errorResponse, successResponse } from '@/lib/api-response';
import { generationInputSchema, uuidSchema } from '@/lib/validation';
import { eq } from 'drizzle-orm';
import { NextRequest } from 'next/server';

type RouteParams = { params: Promise<{ id: string }> };

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
    const parsed = generationInputSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid request body', {
        issues: parsed.error.flatten().fieldErrors,
      });
    }

    // Build insert values
    const inputValues: Record<string, unknown> = { generationId: id };
    for (const [snakeKey, camelKey] of Object.entries(INPUT_KEY_MAP)) {
      const val = (parsed.data as Record<string, string | null | undefined>)[snakeKey];
      if (val) inputValues[camelKey] = val;
    }

    const [created] = await db
      .insert(generationInput)
      .values(inputValues as typeof generationInput.$inferInsert)
      .returning();

    return successResponse(created, 201);
  } catch (error) {
    console.error('Error adding input:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to add input');
  }
}
