import { db } from '@/db/V2';
import { promptVersion } from '@/db/V2/schema';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: Request, context: RouteContext) {
  const { id } = await context.params;

  const [pv] = await db.select().from(promptVersion).where(eq(promptVersion.id, id)).limit(1);

  if (!pv) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(pv);
}

export async function PUT(req: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = await req.json();

  await db.update(promptVersion).set(body).where(eq(promptVersion.id, id));

  return NextResponse.json({ success: true });
}

export async function DELETE(_req: Request, context: RouteContext) {
  const { id } = await context.params;

  await db
    .update(promptVersion)
    .set({ deletedAt: new Date().toISOString() })
    .where(eq(promptVersion.id, id));

  return NextResponse.json({ success: true });
}
