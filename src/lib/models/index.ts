import { generateWithGemini } from './gemini';
import type { ImageGenerationRequest, ImageGenerationResponse } from './types';

export async function generateImage(req: ImageGenerationRequest): Promise<ImageGenerationResponse> {
  switch (req.provider) {
    case 'gemini':
      return generateWithGemini(req);

    default:
      throw new Error(`Unsupported provider: ${req.provider}`);
  }
}
