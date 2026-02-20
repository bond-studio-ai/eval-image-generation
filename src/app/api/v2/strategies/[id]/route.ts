import { db } from '@/db/V2';
import { strategyStep, strategyV2 } from '@/db/V2/schema';
import { asc, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: Request, context: RouteContext) {
  const { id } = await context.params;

  const [strategy] = await db.select().from(strategyV2).where(eq(strategyV2.id, id)).limit(1);

  if (!strategy) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const steps = await db
    .select()
    .from(strategyStep)
    .where(eq(strategyStep.strategyId, id))
    .orderBy(asc(strategyStep.order));

  return NextResponse.json({
    ...strategy,
    steps,
  });
}

export async function PUT(req: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = await req.json();
  const { name, renovationType, steps } = body;

  await db.update(strategyV2).set({ name, renovationType }).where(eq(strategyV2.id, id));

  if (steps) {
    await db.delete(strategyStep).where(eq(strategyStep.strategyId, id));

    await db.insert(strategyStep).values(
      steps.map((step: any, index: number) => ({
        strategyId: id,
        order: index + 1,
        promptVersionId: step.promptVersionId,
        modelId: step.modelId,
        temperature: step.temperature,
        outputType: step.outputType,
        aspectRatio: step.aspectRatio,
        outputResolution: step.outputResolution,
      })),
    );
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(_req: Request, context: RouteContext) {
  const { id } = await context.params;

  await db
    .update(strategyV2)
    .set({ deletedAt: new Date().toISOString() })
    .where(eq(strategyV2.id, id));

  return NextResponse.json({ success: true });
}
