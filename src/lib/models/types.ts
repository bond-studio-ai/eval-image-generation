export interface LabeledInputImage {
  url: string;
  label: string;
}

export interface ImageGenerationRequest {
  provider: string; // "gemini", "openai", etc
  model: string;
  systemPrompt: string;
  userPrompt: string;
  inputImages: LabeledInputImage[];
  aspectRatio?: string;
  imageSize?: string;
  temperature?: number;
  numberOfImages?: number;
}

export interface ImageGenerationResponse {
  outputUrls: string[];
  executionTimeMs: number;
  model: string;
  textResponse?: string;
}
