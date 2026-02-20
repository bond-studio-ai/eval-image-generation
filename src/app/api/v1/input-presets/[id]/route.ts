import { db } from '@/db';
import { generation, inputPreset } from '@/db/schema';
import { errorResponse, successResponse } from '@/lib/api-response';
import { uuidSchema } from '@/lib/validation';
import { count, eq } from 'drizzle-orm';
import { NextRequest } from 'next/server';

const ALLOWED_FIELDS: Record<string, string> = {
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
  name: 'name',
  description: 'description',
};

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!uuidSchema.safeParse(id).success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid preset ID');
    }

    const existing = await db.query.inputPreset.findFirst({
      where: eq(inputPreset.id, id),
    });

    if (!existing) {
      return errorResponse('NOT_FOUND', 'Input preset not found');
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (Array.isArray(body.arbitrary_images)) {
      updates.arbitraryImages = body.arbitrary_images.filter(
        (item: unknown) =>
          item != null &&
          typeof item === 'object' &&
          'url' in item &&
          typeof (item as { url: unknown }).url === 'string' &&
          (item as { url: string }).url.length > 0,
      ).map((item: unknown) => {
        const o = item as { url: string; tag?: string };
        return { url: o.url, tag: typeof o.tag === 'string' ? o.tag : undefined };
      });
    }

    for (const [snakeKey, value] of Object.entries(body)) {
      const camelKey = ALLOWED_FIELDS[snakeKey];
      if (!camelKey) continue;
      updates[camelKey] = typeof value === 'string' ? value : value === null ? null : undefined;
    }
    // Remove undefined so we don't overwrite with undefined
    Object.keys(updates).forEach((k) => updates[k] === undefined && delete updates[k]);

    if (Object.keys(updates).length === 0) {
      return errorResponse('VALIDATION_ERROR', 'No valid fields to update');
    }

    const [updated] = await db
      .update(inputPreset)
      .set(updates)
      .where(eq(inputPreset.id, id))
      .returning();

    return successResponse(updated);
  } catch (error) {
    console.error('Error updating input preset:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to update input preset');
  }
}
