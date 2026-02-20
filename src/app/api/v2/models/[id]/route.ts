import { db } from '@/db/V2';
import { modelV2 } from '@/db/V2/schema';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: Request, context: RouteContext) {
  const { id } = await context.params;

  const [model] = await db.select().from(modelV2).where(eq(modelV2.id, id)).limit(1);

  if (!model) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(model);
}

export async function PUT(req: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = await req.json();

  await db.update(modelV2).set(body).where(eq(modelV2.id, id));

  return NextResponse.json({ success: true });
}

export async function DELETE(_req: Request, context: RouteContext) {
  const { id } = await context.params;

  await db.delete(modelV2).where(eq(modelV2.id, id));

  return NextResponse.json({ success: true });
}
