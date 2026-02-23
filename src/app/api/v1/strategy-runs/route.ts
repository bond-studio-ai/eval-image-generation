import { db } from '@/db';
import { strategyRun } from '@/db/schema';
import { errorResponse, successResponse } from '@/lib/api-response';
import { desc } from 'drizzle-orm';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/strategy-runs
 * List strategy runs across all strategies (for Executions page).
 * Query params: page, limit (optional pagination); sort=created_at, order=desc default.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)));
    const offset = (page - 1) * limit;

    const runs = await db.query.strategyRun.findMany({
      orderBy: [desc(strategyRun.createdAt)],
      limit,
      offset,
      with: {
        strategy: { columns: { id: true, name: true } },
        stepResults: { columns: { id: true, status: true } },
        inputPresets: {
          with: { inputPreset: { columns: { id: true, name: true } } },
        },
      },
    });

    const data = runs.map((run) => ({
      id: run.id,
      strategyId: run.strategyId,
      strategyName: run.strategy?.name ?? null,
      status: run.status,
      createdAt: run.createdAt,
      completedAt: run.completedAt,
      inputPresetName: run.inputPresets?.[0]?.inputPreset?.name ?? null,
      stepResults: run.stepResults,
      stepsSummary: {
        completed: run.stepResults.filter((sr) => sr.status === 'completed').length,
        total: run.stepResults.length,
      },
    }));

    return successResponse(data);
  } catch (error) {
    console.error('Error listing strategy runs:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to list strategy runs');
  }
}
