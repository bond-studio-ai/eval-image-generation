import { db } from '@/db/V1';
import { resultEvaluation } from '@/db/V1/schema';
import { errorResponse, successResponse } from '@/lib/api-response';
import { upsertEvaluationSchema } from '@/lib/validation';
import { eq } from 'drizzle-orm';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = upsertEvaluationSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid request body', {
        issues: parsed.error.flatten().fieldErrors,
      });
    }

    const {
      result_id,
      product_accuracy,
      scene_accuracy_issues,
      scene_accuracy_notes,
    } = parsed.data;

    // Check if evaluation already exists for this result
    const existing = await db.query.resultEvaluation.findFirst({
      where: eq(resultEvaluation.resultId, result_id),
    });

    const values = {
      resultId: result_id,
      productAccuracy: product_accuracy ? JSON.stringify(product_accuracy) : null,
      sceneAccuracyIssues: scene_accuracy_issues
        ? JSON.stringify(scene_accuracy_issues)
        : null,
      sceneAccuracyNotes: scene_accuracy_notes ?? null,
      updatedAt: new Date(),
    };

    if (existing) {
      // Update existing evaluation
      const [updated] = await db
        .update(resultEvaluation)
        .set(values)
        .where(eq(resultEvaluation.id, existing.id))
        .returning();

      return successResponse(formatEvaluation(updated));
    }

    // Create new evaluation
    const [created] = await db
      .insert(resultEvaluation)
      .values(values)
      .returning();

    return successResponse(formatEvaluation(created), 201);
  } catch (error) {
    console.error('Error saving evaluation:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to save evaluation');
  }
}

function formatEvaluation(eval_: typeof resultEvaluation.$inferSelect) {
  return {
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
  };
}
