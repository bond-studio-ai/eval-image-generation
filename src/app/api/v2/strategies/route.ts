import { db } from '@/db/V2';
import { strategyStep, strategyV2 } from '@/db/V2/schema';
import { asc, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function GET() {
  const strategies = await db.select().from(strategyV2);

  return NextResponse.json(strategies);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { name, renovationType, steps = [] } = body;

  if (!name) {
    return NextResponse.json({ error: 'name required' }, { status: 400 });
  }

  const [strategy] = await db
    .insert(strategyV2)
    .values({
      name,
      renovationType,
    })
    .returning();

  if (steps.length) {
    await db.insert(strategyStep).values(
      steps.map((step: any, index: number) => ({
        strategyId: strategy.id,
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

  return NextResponse.json(strategy);
}
