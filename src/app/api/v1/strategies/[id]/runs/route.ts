import { db } from '@/db';
import { strategy, strategyRun } from '@/db/schema';
import { errorResponse, successResponse } from '@/lib/api-response';
import { uuidSchema } from '@/lib/validation';
import { desc, eq } from 'drizzle-orm';
import { NextRequest } from 'next/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!uuidSchema.safeParse(id).success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid strategy ID');
    }

    const strat = await db.query.strategy.findFirst({
      where: eq(strategy.id, id),
      columns: { id: true },
    });

    if (!strat) {
      return errorResponse('NOT_FOUND', 'Strategy not found');
    }

    const runs = await db.query.strategyRun.findMany({
      where: eq(strategyRun.strategyId, id),
      orderBy: [desc(strategyRun.createdAt)],
      limit: 20,
      with: {
        stepResults: {
          columns: { id: true, status: true },
        },
      },
    });

    return successResponse(runs);
  } catch (error) {
    console.error('Error fetching strategy runs:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch strategy runs');
  }
}
