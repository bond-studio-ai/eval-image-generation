import { db } from '@/db';
import { imageEvaluation } from '@/db/schema';
import { errorResponse, successResponse } from '@/lib/api-response';
import { uuidSchema } from '@/lib/validation';
import { eq } from 'drizzle-orm';
import { type NextRequest } from 'next/server';

type RouteParams = { params: Promise<{ outputImageId: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { outputImageId } = await params;

    if (!uuidSchema.safeParse(outputImageId).success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid output image ID');
    }

    const eval_ = await db.query.imageEvaluation.findFirst({
      where: eq(imageEvaluation.outputImageId, outputImageId),
    });

    if (!eval_) {
      // Return empty evaluation (not an error — image just hasn't been evaluated yet)
      return successResponse({
        output_image_id: outputImageId,
        product_accuracy_categories: [],
        product_accuracy_issues: [],
        product_accuracy_notes: '',
        scene_accuracy_issues: [],
        scene_accuracy_notes: '',
        integration_accuracy_issues: [],
        integration_accuracy_notes: '',
      });
    }

    return successResponse({
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
    });
  } catch (error) {
    console.error('Error fetching evaluation:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch evaluation');
  }
}
