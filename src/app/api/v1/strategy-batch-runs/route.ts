import { db } from '@/db';
import { strategyBatchRun } from '@/db/schema';
import { errorResponse, successResponse } from '@/lib/api-response';
import { desc } from 'drizzle-orm';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)));
    const offset = (page - 1) * limit;

    const batches = await db.query.strategyBatchRun.findMany({
      orderBy: [desc(strategyBatchRun.createdAt)],
      limit,
      offset,
      with: {
        strategy: { columns: { id: true, name: true, deletedAt: true } },
        runs: {
          with: {
            strategy: { columns: { name: true } },
            stepResults: {
              columns: { id: true, status: true, outputUrl: true, generationId: true },
              with: {
                step: { columns: { stepOrder: true } },
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
        ) as { id: string; status: string; outputUrl: string | null; generationId: string | null; step: { stepOrder: number } }[];
        const lastResult = resultsWithOrder.length > 0
          ? resultsWithOrder.reduce((a, b) => (a.step.stepOrder > b.step.stepOrder ? a : b))
          : null;
        return {
          id: run.id,
          strategyId: run.strategyId,
          status: run.status,
          createdAt: run.createdAt,
          completedAt: run.completedAt,
          inputPresetName: run.inputPresets?.[0]?.inputPreset?.name ?? null,
          lastOutputUrl: lastResult?.outputUrl ?? null,
          lastOutputGenerationId: lastResult?.generationId ?? null,
          stepResults: run.stepResults.map((sr) => ({ id: sr.id, status: sr.status })),
        };
      });

      const allStatuses = runs.map((r) => r.status);
      const derivedStatus = allStatuses.every((s) => s === 'completed')
        ? 'completed'
        : allStatuses.some((s) => s === 'running' || s === 'pending')
          ? 'running'
          : allStatuses.some((s) => s === 'failed')
            ? 'failed'
            : 'pending';

      const strategyName = batch.strategyId != null
        ? (batch.strategy?.name ?? null)
        : (() => {
            const names = [...new Set(batch.runs.map((r) => r.strategy?.name).filter(Boolean))] as string[];
            return names.length > 0 ? names.join(', ') : 'Multiple strategies';
          })();

      return {
        id: batch.id,
        strategyId: batch.strategyId,
        strategyName,
        executionCount: batch.executionCount,
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
