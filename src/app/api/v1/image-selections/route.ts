import { db } from '@/db';
import { imageSelection } from '@/db/schema';
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

  const toArr = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && !!x) : [];

  const values = {
    dollhouseView: dollhouse_view ?? null,
    realPhoto: real_photo ?? null,
    moodBoard: mood_board ?? null,
    faucets: toArr(faucets),
    lightings: toArr(lightings),
    lvps: toArr(lvps),
    mirrors: toArr(mirrors),
    paints: toArr(paints),
    robeHooks: toArr(robe_hooks),
    shelves: toArr(shelves),
    showerGlasses: toArr(shower_glasses),
    showerSystems: toArr(shower_systems),
    floorTiles: toArr(floor_tiles),
    wallTiles: toArr(wall_tiles),
    showerWallTiles: toArr(shower_wall_tiles),
    showerFloorTiles: toArr(shower_floor_tiles),
    showerCurbTiles: toArr(shower_curb_tiles),
    toiletPaperHolders: toArr(toilet_paper_holders),
    toilets: toArr(toilets),
    towelBars: toArr(towel_bars),
    towelRings: toArr(towel_rings),
    tubDoors: toArr(tub_doors),
    tubFillers: toArr(tub_fillers),
    tubs: toArr(tubs),
    vanities: toArr(vanities),
    wallpapers: toArr(wallpapers),
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
