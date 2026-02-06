import { auth } from '@/lib/auth/server';
import { db } from '@/db';
import { promptVersion } from '@/db/schema';
import { errorResponse, successResponse } from '@/lib/api-response';
import { mockGenerate } from '@/lib/mock-generation';
import { eq } from 'drizzle-orm';

export async function POST(request: Request) {
  try {
    // Validate auth session
    const { data: session } = await auth.getSession();
    if (!session?.user) {
      return errorResponse('UNAUTHORIZED', 'Authentication required');
    }

    const body = await request.json();
    const { prompt_version_id, input_images } = body as {
      prompt_version_id: string;
      input_images?: string[];
    };

    if (!prompt_version_id) {
      return errorResponse('VALIDATION_ERROR', 'prompt_version_id is required');
    }

    // Fetch the prompt version
    const pv = await db.query.promptVersion.findFirst({
      where: eq(promptVersion.id, prompt_version_id),
    });

    if (!pv) {
      return errorResponse('NOT_FOUND', 'Prompt version not found');
    }

    // Run mock generation
    const result = await mockGenerate({
      system_prompt: pv.systemPrompt,
      user_prompt: pv.userPrompt,
      model: pv.model ?? undefined,
      output_type: pv.outputType ?? undefined,
      aspect_ratio: pv.aspectRatio ?? undefined,
      output_resolution: pv.outputResolution ?? undefined,
      temperature: pv.temperature ? Number(pv.temperature) : undefined,
      input_images,
    });

    return successResponse(result);
  } catch (error) {
    console.error('Error in mock generation:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to generate');
  }
}
