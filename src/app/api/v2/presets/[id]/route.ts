import { db } from '@/db/V2';
import { imagePreset, presetProductImage, presetSceneImage } from '@/db/V2/schema';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: Request, context: RouteContext) {
  const { id } = await context.params;

  const [preset] = await db.select().from(imagePreset).where(eq(imagePreset.id, id)).limit(1);

  if (!preset) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const scenes = await db.select().from(presetSceneImage).where(eq(presetSceneImage.presetId, id));

  const products = await db
    .select()
    .from(presetProductImage)
    .where(eq(presetProductImage.presetId, id));

  return NextResponse.json({
    ...preset,
    scenes,
    products,
  });
}

export async function PUT(req: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = await req.json();
  const { name, renovationType, scenes, products } = body;

  await db
    .update(imagePreset)
    .set({
      name,
      renovationType,
    })
    .where(eq(imagePreset.id, id));

  if (scenes) {
    await db.delete(presetSceneImage).where(eq(presetSceneImage.presetId, id));

    await db.insert(presetSceneImage).values(
      scenes.map((s: any) => ({
        presetId: id,
        type: s.type,
        url: s.url,
      })),
    );
  }

  if (products) {
    await db.delete(presetProductImage).where(eq(presetProductImage.presetId, id));

    await db.insert(presetProductImage).values(
      products.map((p: any) => ({
        presetId: id,
        category: p.category,
        productId: p.productId ?? null,
        imageUrl: p.imageUrl,
      })),
    );
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(_req: Request, context: RouteContext) {
  const { id } = await context.params;

  await db
    .update(imagePreset)
    .set({ deletedAt: new Date().toISOString() })
    .where(eq(imagePreset.id, id));

  return NextResponse.json({ success: true });
}
