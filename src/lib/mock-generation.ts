export interface GenerationRequest {
  system_prompt: string;
  user_prompt: string;
  model?: string;
  output_type?: string;
  aspect_ratio?: string;
  output_resolution?: string;
  temperature?: number;
  input_images?: string[];
}

export interface GenerationResponse {
  request: GenerationRequest & { timestamp: string };
  response: {
    status: 'success';
    model: string;
    execution_time_ms: number;
    output_urls: string[];
    metadata: Record<string, unknown>;
  };
}

export async function mockGenerate(req: GenerationRequest): Promise<GenerationResponse> {
  const start = Date.now();

  // Simulate API processing delay
  await new Promise((r) => setTimeout(r, 1000 + Math.random() * 1500));

  const executionTime = Date.now() - start;

  return {
    request: {
      ...req,
      timestamp: new Date().toISOString(),
    },
    response: {
      status: 'success',
      model: req.model ?? 'mock-model-v1',
      execution_time_ms: executionTime,
      output_urls: [], // User uploads the actual output images
      metadata: {
        provider: 'mock',
        version: '1.0',
        note: 'This is a mock response. Upload actual generated images below.',
      },
    },
  };
}
