export interface LabeledInputImage {
  url: string;
  label: string;
}

export interface GenerateRequest {
  systemPrompt: string;
  userPrompt: string;
  model: string;

  inputImages: LabeledInputImage[];

  aspectRatio?: string;
  imageSize?: string;
  temperature?: number;
  numberOfImages?: number;
  useGoogleSearch?: boolean;
  tagImages?: boolean;
}

export interface GenerateResponse {
  outputUrls: string[];
  executionTimeMs: number;
  model: string;
  textResponse?: string;
}

export interface ModelProvider {
  generate(req: GenerateRequest): Promise<GenerateResponse>;
}
