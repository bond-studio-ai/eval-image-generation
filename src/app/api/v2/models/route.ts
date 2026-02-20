import { db } from '@/db/V2';
import { modelV2 } from '@/db/V2/schema';
import { NextResponse } from 'next/server';

export async function GET() {
  const models = await db.select().from(modelV2);
  return NextResponse.json(models);
}

export async function POST(req: Request) {
  const body = await req.json();

  const {
    name,
    provider,
    maxInputTokens,
    maxOutputTokens,
    costPerInputToken,
    costPerOutputToken,
    isActive = 1,
  } = body;

  if (!name || !provider) {
    return NextResponse.json({ error: 'name and provider required' }, { status: 400 });
  }

  const [model] = await db
    .insert(modelV2)
    .values({
      name,
      provider,
      maxInputTokens,
      maxOutputTokens,
      costPerInputToken,
      costPerOutputToken,
      isActive,
    })
    .returning();

  return NextResponse.json(model);
}
