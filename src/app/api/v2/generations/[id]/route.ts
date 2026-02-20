import { db } from '@/db/V2';
import {
  generation,
  generationInput,
  generationResult,
  generationStepExecution,
  resultEvaluation,
} from '@/db/V2/schema';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const gen = await db.select().from(generation).where(eq(generation.id, id)).limit(1);

  if (!gen.length) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const input = await db.select().from(generationInput).where(eq(generationInput.generationId, id));

  const steps = await db
    .select()
    .from(generationStepExecution)
    .where(eq(generationStepExecution.generationId, id));

  const results = await db
    .select()
    .from(generationResult)
    .where(eq(generationResult.generationId, id));

  const evaluations = await db.select().from(resultEvaluation);

  return NextResponse.json({
    generation: gen[0],
    input,
    steps,
    results,
    evaluations: evaluations.filter((e) => results.some((r) => r.id === e.resultId)),
  });
}
