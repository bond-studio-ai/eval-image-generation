import { db } from '@/db/V1';
import { imageSelection } from '@/db/V1/schema';
import { auth } from '@/lib/auth/server';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

/**
 * GET /api/v1/image-selections
 * Returns the authenticated user's saved image selection, or null.
 */
export async function GET() {
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const rows = await db
    .select()
    .from(imageSelection)
    .where(eq(imageSelection.userId, session.user.id))
    .limit(1);

  return NextResponse.json({ data: rows[0] ?? null });
}

/**
 * PUT /api/v1/image-selections
 * Upserts (insert or update) the authenticated user's image selection.
 */
export async function PUT(request: Request) {
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const userId = session.user.id;
  const body = await request.json();

  const {
    dollhouse_view,
    real_photo,
    mood_board,
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
    moodBoard: mood_board ?? null,
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

  // Try to update the user's existing row
  const updated = await db
    .update(imageSelection)
    .set(values)
    .where(eq(imageSelection.userId, userId))
    .returning();

  if (updated.length > 0) {
    return NextResponse.json({ data: updated[0] });
  }

  // Insert new row for this user
  const inserted = await db
    .insert(imageSelection)
    .values({ userId, ...values })
    .returning();

  return NextResponse.json({ data: inserted[0] });
}
