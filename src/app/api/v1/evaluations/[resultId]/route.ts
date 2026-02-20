import { db } from '@/db/V1';
import { resultEvaluation } from '@/db/V1/schema';
import { errorResponse, successResponse } from '@/lib/api-response';
import { uuidSchema } from '@/lib/validation';
import { eq } from 'drizzle-orm';
import { type NextRequest } from 'next/server';

type RouteParams = { params: Promise<{ resultId: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { resultId } = await params;

    if (!uuidSchema.safeParse(resultId).success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid result ID');
    }

    const eval_ = await db.query.resultEvaluation.findFirst({
      where: eq(resultEvaluation.resultId, resultId),
    });

    if (!eval_) {
      // Return empty evaluation (not an error -- result just hasn't been evaluated yet)
      return successResponse({
        result_id: resultId,
        product_accuracy: {},
        scene_accuracy_issues: [],
        scene_accuracy_notes: '',
      });
    }

    return successResponse({
      id: eval_.id,
      result_id: eval_.resultId,
      product_accuracy: eval_.productAccuracy
        ? JSON.parse(eval_.productAccuracy)
        : {},
      scene_accuracy_issues: eval_.sceneAccuracyIssues
        ? JSON.parse(eval_.sceneAccuracyIssues)
        : [],
      scene_accuracy_notes: eval_.sceneAccuracyNotes ?? '',
      created_at: eval_.createdAt,
      updated_at: eval_.updatedAt,
    });
  } catch (error) {
    console.error('Error fetching evaluation:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch evaluation');
  }
}
