import { db } from '@/db';
import { strategyBatchRun, strategyRun, strategyRunInputPreset, strategyStepResult } from '@/db/schema';
import { errorResponse, successResponse } from '@/lib/api-response';
import { uuidSchema } from '@/lib/validation';
import { eq, inArray } from 'drizzle-orm';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> },
) {
  try {
    const { batchId } = await params;
    if (!uuidSchema.safeParse(batchId).success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid batch ID');
    }

    const runs = await db
      .select({ id: strategyRun.id })
      .from(strategyRun)
      .where(eq(strategyRun.batchRunId, batchId));

    if (runs.length > 0) {
      const runIds = runs.map((r) => r.id);
      await db.delete(strategyRunInputPreset).where(inArray(strategyRunInputPreset.strategyRunId, runIds));
      await db.delete(strategyStepResult).where(inArray(strategyStepResult.strategyRunId, runIds));
      await db.delete(strategyRun).where(inArray(strategyRun.id, runIds));
    }

    await db.delete(strategyBatchRun).where(eq(strategyBatchRun.id, batchId));

    return successResponse({ deleted: true });
  } catch (error) {
    console.error('Error deleting batch run:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to delete batch run');
  }
}
