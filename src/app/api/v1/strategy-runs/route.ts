import { db } from '@/db';
import { strategyRun } from '@/db/schema';
import { errorResponse, successResponse } from '@/lib/api-response';
import { desc, isNull } from 'drizzle-orm';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/strategy-runs
 * List individual (non-batch) strategy runs across all strategies.
 * ?individual_only=true (default) filters out batch runs.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') ?? '100', 10)));
    const offset = (page - 1) * limit;
    const individualOnly = searchParams.get('individual_only') !== 'false';

    const runs = await db.query.strategyRun.findMany({
      where: individualOnly ? isNull(strategyRun.batchRunId) : undefined,
      orderBy: [desc(strategyRun.createdAt)],
      limit,
      offset,
      with: {
        strategy: { columns: { id: true, name: true, deletedAt: true } },
        stepResults: {
          columns: { id: true, status: true, outputUrl: true, generationId: true },
          with: {
            step: { columns: { stepOrder: true } },
          },
        },
        inputPresets: {
          with: { inputPreset: { columns: { id: true, name: true } } },
        },
      },
    });

    const runsForActiveStrategies = runs.filter(
      (run) => run.strategy?.deletedAt == null,
    );

    const data = runsForActiveStrategies.map((run) => {
      const resultsWithOrder =       (run.stepResults ?? []).filter(
        (sr) => sr.step != null,
      ) as { id: string; status: string; outputUrl: string | null; generationId: string | null; step: { stepOrder: number } }[];
      const lastResult = resultsWithOrder.length > 0
        ? resultsWithOrder.reduce((a, b) => (a.step.stepOrder > b.step.stepOrder ? a : b))
        : null;
      return {
        id: run.id,
        strategyId: run.strategyId,
        strategyName: run.strategy?.name ?? null,
        batchRunId: run.batchRunId ?? null,
        status: run.status,
        createdAt: run.createdAt,
        completedAt: run.completedAt,
        inputPresetName: run.inputPresets?.[0]?.inputPreset?.name ?? null,
        lastOutputUrl: lastResult?.outputUrl ?? null,
        lastOutputGenerationId: lastResult?.generationId ?? null,
        stepsSummary: {
          completed: run.stepResults.filter((sr) => sr.status === 'completed').length,
          total: run.stepResults.length,
        },
      };
    });

    return successResponse(data);
  } catch (error) {
    console.error('Error listing strategy runs:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to list strategy runs');
  }
}
