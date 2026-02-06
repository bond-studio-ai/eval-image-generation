import { db } from '@/db';
import { imageEvaluation } from '@/db/schema';
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
      output_image_id,
      product_accuracy_categories,
      product_accuracy_issues,
      product_accuracy_notes,
      scene_accuracy_issues,
      scene_accuracy_notes,
      integration_accuracy_issues,
      integration_accuracy_notes,
    } = parsed.data;

    // Check if evaluation already exists for this output image
    const existing = await db.query.imageEvaluation.findFirst({
      where: eq(imageEvaluation.outputImageId, output_image_id),
    });

    const values = {
      outputImageId: output_image_id,
      productAccuracyCategories: product_accuracy_categories
        ? JSON.stringify(product_accuracy_categories)
        : null,
      productAccuracyIssues: product_accuracy_issues
        ? JSON.stringify(product_accuracy_issues)
        : null,
      productAccuracyNotes: product_accuracy_notes ?? null,
      sceneAccuracyIssues: scene_accuracy_issues
        ? JSON.stringify(scene_accuracy_issues)
        : null,
      sceneAccuracyNotes: scene_accuracy_notes ?? null,
      integrationAccuracyIssues: integration_accuracy_issues
        ? JSON.stringify(integration_accuracy_issues)
        : null,
      integrationAccuracyNotes: integration_accuracy_notes ?? null,
      updatedAt: new Date(),
    };

    if (existing) {
      // Update existing evaluation
      const [updated] = await db
        .update(imageEvaluation)
        .set(values)
        .where(eq(imageEvaluation.id, existing.id))
        .returning();

      return successResponse(formatEvaluation(updated));
    }

    // Create new evaluation
    const [created] = await db
      .insert(imageEvaluation)
      .values(values)
      .returning();

    return successResponse(formatEvaluation(created), 201);
  } catch (error) {
    console.error('Error saving evaluation:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to save evaluation');
  }
}

function formatEvaluation(eval_: typeof imageEvaluation.$inferSelect) {
  return {
    id: eval_.id,
    output_image_id: eval_.outputImageId,
    product_accuracy_categories: eval_.productAccuracyCategories
      ? JSON.parse(eval_.productAccuracyCategories)
      : [],
    product_accuracy_issues: eval_.productAccuracyIssues
      ? JSON.parse(eval_.productAccuracyIssues)
      : [],
    product_accuracy_notes: eval_.productAccuracyNotes ?? '',
    scene_accuracy_issues: eval_.sceneAccuracyIssues
      ? JSON.parse(eval_.sceneAccuracyIssues)
      : [],
    scene_accuracy_notes: eval_.sceneAccuracyNotes ?? '',
    integration_accuracy_issues: eval_.integrationAccuracyIssues
      ? JSON.parse(eval_.integrationAccuracyIssues)
      : [],
    integration_accuracy_notes: eval_.integrationAccuracyNotes ?? '',
    created_at: eval_.createdAt,
    updated_at: eval_.updatedAt,
  };
}
