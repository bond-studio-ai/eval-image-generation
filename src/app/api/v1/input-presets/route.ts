import { db } from '@/db';
import { generation, inputPreset } from '@/db/schema';
import { errorResponse, paginatedResponse, successResponse } from '@/lib/api-response';
import { createInputPresetSchema, listInputPresetsSchema } from '@/lib/validation';
import { and, asc, count, desc, eq, isNull } from 'drizzle-orm';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const params = Object.fromEntries(request.nextUrl.searchParams);
    const parsed = listInputPresetsSchema.safeParse(params);

    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid query parameters', {
        issues: parsed.error.flatten().fieldErrors,
      });
    }

    const { page, limit, include_deleted, sort, order } = parsed.data;
    const offset = (page - 1) * limit;

    const conditions = include_deleted ? [] : [isNull(inputPreset.deletedAt)];

    const orderBy =
      sort === 'name'
        ? order === 'asc'
          ? asc(inputPreset.name)
          : desc(inputPreset.name)
        : order === 'asc'
          ? asc(inputPreset.createdAt)
          : desc(inputPreset.createdAt);

    const [rows, totalResult] = await Promise.all([
      db
        .select()
        .from(inputPreset)
        .where(and(...conditions))
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(inputPreset)
        .where(and(...conditions)),
    ]);

    const total = totalResult[0]?.count ?? 0;

    const data = await Promise.all(
      rows.map(async (ip) => {
        const stats = await db
          .select({ count: count() })
          .from(generation)
          .where(eq(generation.inputPresetId, ip.id));

        return {
          ...ip,
          stats: {
            generation_count: stats[0]?.count ?? 0,
          },
        };
      }),
    );

    return paginatedResponse(data, { page, limit, total });
  } catch (error) {
    console.error('Error listing input presets:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to list input presets');
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createInputPresetSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid request body', {
        issues: parsed.error.flatten().fieldErrors,
      });
    }

    const { name, description, arbitrary_images, ...images } = parsed.data;

    const [created] = await db
      .insert(inputPreset)
      .values({
        name: name ?? null,
        description: description ?? null,
        dollhouseView: images.dollhouse_view ?? null,
        realPhoto: images.real_photo ?? null,
        moodBoard: images.mood_board ?? null,
        faucets: images.faucets ?? null,
        lightings: images.lightings ?? null,
        lvps: images.lvps ?? null,
        mirrors: images.mirrors ?? null,
        paints: images.paints ?? null,
        robeHooks: images.robe_hooks ?? null,
        shelves: images.shelves ?? null,
        showerGlasses: images.shower_glasses ?? null,
        showerSystems: images.shower_systems ?? null,
        floorTiles: images.floor_tiles ?? null,
        wallTiles: images.wall_tiles ?? null,
        showerWallTiles: images.shower_wall_tiles ?? null,
        showerFloorTiles: images.shower_floor_tiles ?? null,
        showerCurbTiles: images.shower_curb_tiles ?? null,
        toiletPaperHolders: images.toilet_paper_holders ?? null,
        toilets: images.toilets ?? null,
        towelBars: images.towel_bars ?? null,
        towelRings: images.towel_rings ?? null,
        tubDoors: images.tub_doors ?? null,
        tubFillers: images.tub_fillers ?? null,
        tubs: images.tubs ?? null,
        vanities: images.vanities ?? null,
        wallpapers: images.wallpapers ?? null,
        arbitraryImages: arbitrary_images ?? [],
      })
      .returning();

    return successResponse(created, 201);
  } catch (error) {
    console.error('Error creating input preset:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to create input preset');
  }
}
