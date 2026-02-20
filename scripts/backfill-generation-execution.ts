import 'dotenv/config';

import { eq, isNull, sql } from 'drizzle-orm';
import { db } from '../src/db/V1'; // adjust path
import {
  generation,
  generationInput,
  generationStepExecution,
  modelV2,
  promptVersion,
} from '../src/db/V1/schema';

async function backfillRenovationType() {
  console.log('Backfilling renovation_type...');

  const rows = await db
    .select({
      generationId: generation.id,
      dollhouse: generationInput.dollhouseView,
    })
    .from(generation)
    .leftJoin(generationInput, eq(generationInput.generationId, generation.id));

  for (const row of rows) {
    const type = row.dollhouse ? 'FULL' : 'PARTIAL';

    await db
      .update(generation)
      .set({ renovationType: type })
      .where(eq(generation.id, row.generationId));
  }

  console.log('Renovation type backfill complete.');
}

async function backfillStepExecutions() {
  console.log('Backfilling generation_step_execution...');

  const existing = await db
    .select({ generationId: generationStepExecution.generationId })
    .from(generationStepExecution);

  const existingSet = new Set(existing.map((e) => e.generationId));

  const gens = await db
    .select({
      id: generation.id,
      promptVersionId: generation.promptVersionId,
      modelId: generation.modelId,
    })
    .from(generation);

  for (const gen of gens) {
    if (existingSet.has(gen.id)) continue;

    const pv = await db
      .select()
      .from(promptVersion)
      .where(eq(promptVersion.id, gen.promptVersionId))
      .limit(1);

    if (!pv.length) {
      console.warn(`Skipping ${gen.id} — no prompt_version`);
      continue;
    }

    let modelName = pv[0].model ?? 'unknown';
    let provider = 'unknown';

    if (gen.modelId) {
      const model = await db.select().from(modelV2).where(eq(modelV2.id, gen.modelId)).limit(1);

      if (model.length) {
        modelName = model[0].name;
        provider = model[0].provider;
      }
    }

    await db.insert(generationStepExecution).values({
      generationId: gen.id,
      stepOrder: 1,
      systemPrompt: pv[0].systemPrompt,
      userPrompt: pv[0].userPrompt,
      modelName,
      provider,
      temperature: pv[0].temperature,
      outputType: pv[0].outputType,
      aspectRatio: pv[0].aspectRatio,
      outputResolution: pv[0].outputResolution,
    });
  }

  console.log('Step execution backfill complete.');
}

async function main() {
  await backfillRenovationType();
  await backfillStepExecutions();
  console.log('Backfill finished successfully.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
