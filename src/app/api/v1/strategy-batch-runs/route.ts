import { db } from '@/db';
import { strategyBatchRun } from '@/db/schema';
import { errorResponse, successResponse } from '@/lib/api-response';
import { and, desc, gte, lte } from 'drizzle-orm';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)));
    const offset = (page - 1) * limit;
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const dateConditions = [];
    if (from) dateConditions.push(gte(strategyBatchRun.createdAt, new Date(from + 'T00:00:00')));
    if (to) dateConditions.push(lte(strategyBatchRun.createdAt, new Date(to + 'T23:59:59.999')));
    const whereClause = dateConditions.length > 0 ? and(...dateConditions) : undefined;

    const batches = await db.query.strategyBatchRun.findMany({
      orderBy: [desc(strategyBatchRun.createdAt)],
      where: whereClause,
      limit,
      offset,
      with: {
        strategy: { columns: { id: true, name: true, deletedAt: true } },
        runs: {
          with: {
            strategy: { columns: { id: true, name: true } },
            stepResults: {
              columns: { id: true, status: true, outputUrl: true, generationId: true },
              with: {
                step: { columns: { stepOrder: true } },
                generation: { columns: { id: true, sceneAccuracyRating: true, productAccuracyRating: true } },
              },
            },
            inputPresets: {
              with: {
                inputPreset: { columns: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    const activeBatches = batches.filter(
      (batch) => batch.strategyId == null || batch.strategy?.deletedAt == null,
    );

    const data = activeBatches.map((batch) => {
      const runs = batch.runs.map((run) => {
        const resultsWithOrder = (run.stepResults ?? []).filter(
          (sr) => sr.step != null,
        ) as { id: string; status: string; outputUrl: string | null; generationId: string | null; step: { stepOrder: number }; generation: { id: string; sceneAccuracyRating: string | null; productAccuracyRating: string | null } | null }[];
        const lastResult = resultsWithOrder.length > 0
          ? resultsWithOrder.reduce((a, b) => (a.step.stepOrder > b.step.stepOrder ? a : b))
          : null;

        const generations = resultsWithOrder
          .map((sr) => sr.generation)
          .filter((g): g is NonNullable<typeof g> => g != null);
        const totalGenerations = generations.length;
        const ratedGenerations = generations.filter(
          (g) => g.sceneAccuracyRating != null || g.productAccuracyRating != null,
        ).length;

        return {
          id: run.id,
          strategyId: run.strategyId,
          strategyName: (run.strategy as { id: string; name: string } | null)?.name ?? null,
          status: run.status,
          createdAt: run.createdAt,
          completedAt: run.completedAt,
          inputPresetName: run.inputPresets?.[0]?.inputPreset?.name ?? null,
          lastOutputUrl: lastResult?.outputUrl ?? null,
          lastOutputGenerationId: lastResult?.generationId ?? null,
          stepResults: run.stepResults.map((sr) => ({ id: sr.id, status: sr.status })),
          totalGenerations,
          ratedGenerations,
        };
      });

      const isAnyExecuting = runs.some((r) => r.status === 'running' || r.status === 'pending');
      let derivedStatus: string;
      if (isAnyExecuting) {
        derivedStatus = 'running';
      } else {
        const totalGens = runs.reduce((sum, r) => sum + r.totalGenerations, 0);
        const ratedGens = runs.reduce((sum, r) => sum + r.ratedGenerations, 0);
        if (totalGens === 0) {
          derivedStatus = 'pending';
        } else if (ratedGens === 0) {
          derivedStatus = 'pending';
        } else if (ratedGens >= totalGens) {
          derivedStatus = 'reviewed';
        } else {
          derivedStatus = 'in_progress';
        }
      }

      const strategiesMap = new Map<string, string>();
      for (const run of batch.runs) {
        const s = run.strategy as { id: string; name: string } | null;
        if (s) strategiesMap.set(s.id, s.name);
      }
      const strategies = Array.from(strategiesMap, ([id, name]) => ({ id, name }));

      return {
        id: batch.id,
        strategyId: batch.strategyId,
        strategies,
        numberOfImages: batch.numberOfImages,
        createdAt: batch.createdAt,
        status: derivedStatus,
        totalRuns: runs.length,
        completedRuns: runs.filter((r) => r.status === 'completed').length,
        failedRuns: runs.filter((r) => r.status === 'failed').length,
        runs,
      };
    });

    return successResponse(data);
  } catch (error) {
    console.error('Error listing strategy batch runs:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to list batch runs');
  }
}
