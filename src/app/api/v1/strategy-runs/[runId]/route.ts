import { db } from '@/db';
import { strategyRun, strategyStepResult } from '@/db/schema';
import { errorResponse, successResponse } from '@/lib/api-response';
import { patchStrategyRunSchema, uuidSchema } from '@/lib/validation';
import { eq } from 'drizzle-orm';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> },
) {
  try {
    const { runId } = await params;
    if (!uuidSchema.safeParse(runId).success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid run ID');
    }
    const body = await request.json();
    const parsed = patchStrategyRunSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', parsed.error.message);
    }
    const [updated] = await db
      .update(strategyRun)
      .set({ status: parsed.data.status })
      .where(eq(strategyRun.id, runId))
      .returning({ id: strategyRun.id, status: strategyRun.status });
    if (!updated) {
      return errorResponse('NOT_FOUND', 'Strategy run not found');
    }
    return successResponse(updated);
  } catch (error) {
    console.error('Error updating strategy run:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to update strategy run');
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ runId: string }> },
) {
  try {
    const { runId } = await params;

    if (!uuidSchema.safeParse(runId).success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid run ID');
    }

    const result = await db.query.strategyRun.findFirst({
      where: eq(strategyRun.id, runId),
      with: {
        strategy: {
          columns: {
            id: true,
            name: true,
            model: true,
            aspectRatio: true,
            outputResolution: true,
            temperature: true,
            useGoogleSearch: true,
            tagImages: true,
          },
        },
        stepResults: {
          orderBy: [strategyStepResult.strategyStepId],
          with: {
            step: {
              columns: { stepOrder: true, name: true, model: true, aspectRatio: true, outputResolution: true, temperature: true, dollhouseViewFromStep: true, realPhotoFromStep: true, moodBoardFromStep: true },
              with: {
                promptVersion: { columns: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    if (!result) {
      return errorResponse('NOT_FOUND', 'Strategy run not found');
    }

    // Sort step results by step order
    const sortedResults = [...result.stepResults].sort(
      (a, b) => (a.step?.stepOrder ?? 0) - (b.step?.stepOrder ?? 0),
    );

    return successResponse({ ...result, stepResults: sortedResults });
  } catch (error) {
    console.error('Error fetching strategy run:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch strategy run');
  }
}
