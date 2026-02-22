import { GeminiProvider } from './providers/gemini.provider';
import { SeedreamProvider } from './providers/seedream.provider';
import { GenerateRequest, GenerateResponse } from './types';

const gemini = new GeminiProvider();
const seedream = new SeedreamProvider();

function resolveProvider(model: string) {
  if (model.startsWith('seedream')) return seedream;
  if (model.startsWith('gemini')) return gemini;

  return gemini; // default
}

export async function generate(req: GenerateRequest): Promise<GenerateResponse> {
  const provider = resolveProvider(req.model);
  return provider.generate(req);
}
