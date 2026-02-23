import { db } from '@/db';
import { inputPreset } from '@/db/schema';
import { errorResponse, successResponse } from '@/lib/api-response';
import { uuidSchema } from '@/lib/validation';
import { eq } from 'drizzle-orm';
import { NextRequest } from 'next/server';

export async function POST(
  _request: NextRequest,
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

    const baseName = existing.name?.trim() || 'Untitled';
    const copyName = baseName.length + 8 > 255 ? `${baseName.slice(0, 247)} (copy)` : `${baseName} (copy)`;

    const [cloned] = await db
      .insert(inputPreset)
      .values({
        name: copyName,
        description: existing.description,
        dollhouseView: existing.dollhouseView,
        realPhoto: existing.realPhoto,
        moodBoard: existing.moodBoard,
        faucets: existing.faucets ?? [],
        lightings: existing.lightings ?? [],
        lvps: existing.lvps ?? [],
        mirrors: existing.mirrors ?? [],
        paints: existing.paints ?? [],
        robeHooks: existing.robeHooks ?? [],
        shelves: existing.shelves ?? [],
        showerGlasses: existing.showerGlasses ?? [],
        showerSystems: existing.showerSystems ?? [],
        floorTiles: existing.floorTiles ?? [],
        wallTiles: existing.wallTiles ?? [],
        showerWallTiles: existing.showerWallTiles ?? [],
        showerFloorTiles: existing.showerFloorTiles ?? [],
        showerCurbTiles: existing.showerCurbTiles ?? [],
        toiletPaperHolders: existing.toiletPaperHolders ?? [],
        toilets: existing.toilets ?? [],
        towelBars: existing.towelBars ?? [],
        towelRings: existing.towelRings ?? [],
        tubDoors: existing.tubDoors ?? [],
        tubFillers: existing.tubFillers ?? [],
        tubs: existing.tubs ?? [],
        vanities: existing.vanities ?? [],
        wallpapers: existing.wallpapers ?? [],
        arbitraryImages: existing.arbitraryImages ?? [],
      })
      .returning();

    return successResponse(cloned, 201);
  } catch (error) {
    console.error('Error cloning input preset:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to clone input preset');
  }
}
