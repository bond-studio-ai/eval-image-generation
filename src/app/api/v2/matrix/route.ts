import { db } from '@/db/V2';
import {
  generation,
  generationResult,
  imagePreset,
  resultEvaluation,
  strategyV2,
} from '@/db/V2/schema';
import { desc, isNull } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function GET() {
  const presets = await db
    .select({
      id: imagePreset.id,
      name: imagePreset.name,
    })
    .from(imagePreset)
    .where(isNull(imagePreset.deletedAt));

  const strategies = await db
    .select({
      id: strategyV2.id,
      name: strategyV2.name,
    })
    .from(strategyV2)
    .where(isNull(strategyV2.deletedAt));

  const generations = await db.select().from(generation).orderBy(desc(generation.createdAt));

  // Latest generation per preset+strategy
  const latestMap = new Map<string, (typeof generations)[number]>();
  const runCountMap = new Map<string, number>();

  for (const g of generations) {
    if (!g.inputPresetId || !g.strategyId) continue;

    const key = `${g.inputPresetId}_${g.strategyId}`;

    if (!latestMap.has(key)) {
      latestMap.set(key, g);
    }

    runCountMap.set(key, (runCountMap.get(key) ?? 0) + 1);
  }

  const allResults = await db.select().from(generationResult);
  const allEvaluations = await db.select().from(resultEvaluation);

  const resultByGeneration = new Map<string, typeof allResults>();

  for (const r of allResults) {
    if (!resultByGeneration.has(r.generationId)) {
      resultByGeneration.set(r.generationId, []);
    }
    resultByGeneration.get(r.generationId)!.push(r);
  }

  const evalByResult = new Map<string, (typeof allEvaluations)[number]>();
  for (const e of allEvaluations) {
    evalByResult.set(e.resultId, e);
  }

  const cells = [];

  for (const preset of presets) {
    for (const strategy of strategies) {
      const key = `${preset.id}_${strategy.id}`;
      const gen = latestMap.get(key);

      if (!gen) {
        cells.push({
          presetId: preset.id,
          strategyId: strategy.id,
          generationId: null,
          status: 'not_run',
          score: null,
          lastRunAt: null,
          runCount: 0,
        });
        continue;
      }

      const results = resultByGeneration.get(gen.id) || [];

      let needsEval = false;
      let goodCount = 0;
      let totalCount = 0;

      for (const r of results) {
        const evaluation = evalByResult.get(r.id);

        if (!evaluation) {
          needsEval = true;
          continue;
        }

        if (!evaluation.productAccuracy || !evaluation.sceneAccuracyIssues) {
          needsEval = true;
        }

        totalCount++;

        if (evaluation.productAccuracy === 'GOOD') {
          goodCount++;
        }
      }

      const score = totalCount > 0 ? Math.round((goodCount / totalCount) * 100) : null;

      cells.push({
        presetId: preset.id,
        strategyId: strategy.id,
        generationId: gen.id,
        status: needsEval ? 'needs_eval' : 'complete',
        score,
        lastRunAt: gen.createdAt,
        runCount: runCountMap.get(key) ?? 0,
      });
    }
  }

  return NextResponse.json({
    presets,
    strategies,
    cells,
  });
}
