import { executeSteps } from '@/app/api/v1/strategies/[id]/run/route';
import { db } from '@/db';
import { inputPreset, strategy, strategyBatchRun, strategyRun, strategyRunInputPreset, strategyStep, strategyStepResult } from '@/db/schema';
import { errorResponse, successResponse } from '@/lib/api-response';
import { uuidSchema } from '@/lib/validation';
import { eq, inArray } from 'drizzle-orm';
import { after, NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

/** POST: create one batch spanning multiple strategies × presets × number_of_images. */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const rawStrategyIds = body?.strategy_ids;
    const rawPresetIds = body?.input_preset_ids;
    const numberOfImages = typeof body?.number_of_images === 'number'
      ? Math.max(1, Math.min(100, body.number_of_images))
      : 1;
    const batchName = typeof body?.name === 'string' && body.name.trim()
      ? body.name.trim()
      : `Run ${new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}`;

    if (!Array.isArray(rawStrategyIds) || rawStrategyIds.length === 0) {
      return errorResponse('VALIDATION_ERROR', 'At least one strategy is required');
    }
    if (!Array.isArray(rawPresetIds) || rawPresetIds.length === 0) {
      return errorResponse('VALIDATION_ERROR', 'At least one input preset is required');
    }

    const strategyIds = rawStrategyIds.filter(
      (x: unknown) => typeof x === 'string' && uuidSchema.safeParse(x).success,
    ) as string[];
    const presetIds = rawPresetIds.filter(
      (x: unknown) => typeof x === 'string' && uuidSchema.safeParse(x).success,
    ) as string[];

    if (strategyIds.length === 0) return errorResponse('VALIDATION_ERROR', 'At least one valid strategy ID is required');
    if (presetIds.length === 0) return errorResponse('VALIDATION_ERROR', 'At least one valid input preset ID is required');

    const strategies = await db.query.strategy.findMany({
      where: inArray(strategy.id, strategyIds),
      with: { steps: { orderBy: [strategyStep.stepOrder] } },
    });
    const strategyMap = new Map(strategies.map((s) => [s.id, s]));
    const missingStrategyIds = strategyIds.filter((id) => !strategyMap.has(id));
    if (missingStrategyIds.length > 0) {
      return errorResponse('VALIDATION_ERROR', `Strategies not found: ${missingStrategyIds.join(', ')}`);
    }

    const existingPresets = await db.select({ id: inputPreset.id }).from(inputPreset).where(inArray(inputPreset.id, presetIds));
    const presetSet = new Set(existingPresets.map((p) => p.id));
    const missingPresetIds = presetIds.filter((id) => !presetSet.has(id));
    if (missingPresetIds.length > 0) {
      return errorResponse('VALIDATION_ERROR', `Input presets not found: ${missingPresetIds.join(', ')}`);
    }

    for (const strat of strategies) {
      if (!strat.steps || strat.steps.length === 0) {
        return errorResponse('VALIDATION_ERROR', `Strategy "${strat.name}" has no steps`);
      }
    }

    const [batch] = await db
      .insert(strategyBatchRun)
      .values({ name: batchName, strategyId: null, numberOfImages })
      .returning();

    if (!batch) return errorResponse('INTERNAL_ERROR', 'Failed to create batch');

    const runs: { id: string; strategyId: string; steps: typeof strategyStep.$inferSelect[]; defaults: Parameters<typeof executeSteps>[2] }[] = [];

    for (const strategyId of strategyIds) {
      const strat = strategyMap.get(strategyId)!;
      const steps = strat.steps as typeof strategyStep.$inferSelect[];
      const defaults = {
        model: strat.model,
        aspectRatio: strat.aspectRatio,
        outputResolution: strat.outputResolution,
        temperature: strat.temperature,
        useGoogleSearch: strat.useGoogleSearch,
        tagImages: strat.tagImages,
      };
      for (const presetId of presetIds) {
        for (let i = 0; i < numberOfImages; i++) {
          const [run] = await db
            .insert(strategyRun)
            .values({ strategyId, batchRunId: batch.id, status: 'running' })
            .returning();
          if (!run) continue;
          await db.insert(strategyRunInputPreset).values({
            strategyRunId: run.id,
            inputPresetId: presetId,
            order: 0,
          });
          await db.insert(strategyStepResult).values(
            steps.map((step) => ({
              strategyRunId: run.id,
              strategyStepId: step.id,
              status: 'pending',
            })),
          );
          runs.push({ id: run.id, strategyId, steps, defaults });
        }
      }
    }

    for (const run of runs) {
      after(() => executeSteps(run.id, run.steps, run.defaults));
    }

    return successResponse(
      {
        batchRunId: batch.id,
        totalRuns: runs.length,
      },
      201,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to start run';
    return errorResponse('INTERNAL_ERROR', message);
  }
}
