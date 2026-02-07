import { db } from '@/db';
import { imageSelection } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

/**
 * GET /api/v1/image-selections?id=<uuid>
 * Returns the saved image selection for the given id, or null.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    // Return the first (most recently updated) selection if no id provided
    const rows = await db.select().from(imageSelection).limit(1);
    return NextResponse.json({ data: rows[0] ?? null });
  }

  const rows = await db.select().from(imageSelection).where(eq(imageSelection.id, id)).limit(1);
  return NextResponse.json({ data: rows[0] ?? null });
}

/**
 * PUT /api/v1/image-selections
 * Upserts (insert or update) an image selection row.
 */
export async function PUT(request: Request) {
  const body = await request.json();

  const {
    id,
    dollhouse_view,
    real_photo,
    faucets,
    lightings,
    lvps,
    mirrors,
    paints,
    robe_hooks,
    shelves,
    shower_glasses,
    shower_systems,
    floor_tiles,
    wall_tiles,
    shower_wall_tiles,
    shower_floor_tiles,
    shower_curb_tiles,
    toilet_paper_holders,
    toilets,
    towel_bars,
    towel_rings,
    tub_doors,
    tub_fillers,
    tubs,
    vanities,
    wallpapers,
  } = body;

  const values = {
    dollhouseView: dollhouse_view ?? null,
    realPhoto: real_photo ?? null,
    faucets: faucets ?? null,
    lightings: lightings ?? null,
    lvps: lvps ?? null,
    mirrors: mirrors ?? null,
    paints: paints ?? null,
    robeHooks: robe_hooks ?? null,
    shelves: shelves ?? null,
    showerGlasses: shower_glasses ?? null,
    showerSystems: shower_systems ?? null,
    floorTiles: floor_tiles ?? null,
    wallTiles: wall_tiles ?? null,
    showerWallTiles: shower_wall_tiles ?? null,
    showerFloorTiles: shower_floor_tiles ?? null,
    showerCurbTiles: shower_curb_tiles ?? null,
    toiletPaperHolders: toilet_paper_holders ?? null,
    toilets: toilets ?? null,
    towelBars: towel_bars ?? null,
    towelRings: towel_rings ?? null,
    tubDoors: tub_doors ?? null,
    tubFillers: tub_fillers ?? null,
    tubs: tubs ?? null,
    vanities: vanities ?? null,
    wallpapers: wallpapers ?? null,
    updatedAt: new Date(),
  };

  if (id) {
    // Try update first
    const updated = await db
      .update(imageSelection)
      .set(values)
      .where(eq(imageSelection.id, id))
      .returning();

    if (updated.length > 0) {
      return NextResponse.json({ data: updated[0] });
    }
  }

  // Insert new row
  const inserted = await db
    .insert(imageSelection)
    .values(id ? { id, ...values } : values)
    .returning();

  return NextResponse.json({ data: inserted[0] });
}
