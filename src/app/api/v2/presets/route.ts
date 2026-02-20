import { db } from '@/db/V2';
import { imagePreset, presetProductImage, presetSceneImage } from '@/db/V2/schema';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function GET() {
  const presets = await db.select().from(imagePreset);

  return NextResponse.json(presets);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { name, renovationType, userId, scenes = [], products = [] } = body;

  if (!name) {
    return NextResponse.json({ error: 'name required' }, { status: 400 });
  }

  const [preset] = await db
    .insert(imagePreset)
    .values({
      name,
      renovationType,
      userId,
    })
    .returning();

  if (scenes.length) {
    await db.insert(presetSceneImage).values(
      scenes.map((s: any) => ({
        presetId: preset.id,
        type: s.type,
        url: s.url,
      })),
    );
  }

  if (products.length) {
    await db.insert(presetProductImage).values(
      products.map((p: any) => ({
        presetId: preset.id,
        category: p.category,
        productId: p.productId ?? null,
        imageUrl: p.imageUrl,
      })),
    );
  }

  return NextResponse.json(preset);
}
