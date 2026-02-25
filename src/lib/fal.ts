import { withImageParams } from './image-utils';
import { fetchAndUploadToS3 } from './s3';

export interface FalGenerateRequest {
  systemPrompt: string;
  userPrompt: string;
  model: string;
  inputImages: { url: string; label: string }[];
  aspectRatio?: string;
  imageSize?: string;
  numberOfImages?: number;
  tagImages?: boolean;
}

export interface FalGenerateResponse {
  outputUrls: string[];
  executionTimeMs: number;
  model: string;
}

const FAL_API_HOST = 'https://fal.run';

const FAL_MODELS: Record<string, string> = {
  'seedream-4.5': 'fal-ai/bytedance/seedream/v4.5/edit',
};

const MAX_RETRIES = 3;
const RETRYABLE_STATUS = new Set([429, 500, 502, 503]);

function buildPrompt(req: FalGenerateRequest): string {
  if (req.tagImages === false) return req.userPrompt;

  const imageContext = req.inputImages
    .map((img, i) => `Reference image ${i + 1} (${img.label})`)
    .join('\n');

  return [req.systemPrompt, imageContext, req.userPrompt]
    .filter(Boolean)
    .join('\n\n');
}

export async function generateWithFal(req: FalGenerateRequest): Promise<FalGenerateResponse> {
  const apiKey = process.env.FAL_KEY;
  if (!apiKey) throw new Error('FAL_KEY environment variable is not set');

  const falModelPath = FAL_MODELS[req.model];
  if (!falModelPath) throw new Error(`Unknown Fal model: ${req.model}`);

  if (!req.inputImages?.length) {
    throw new Error('Seedream requires at least one input image');
  }

  const start = Date.now();
  const endpoint = `${FAL_API_HOST}/${falModelPath}`;
  const prompt = buildPrompt(req);
  const numImages = Math.max(1, Math.min(req.numberOfImages ?? 1, 4));
  const outputUrls: string[] = [];

  for (let i = 0; i < numImages; i++) {
    let lastError: unknown;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            Authorization: `Key ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt,
            image_urls: req.inputImages.map((img) => withImageParams(img.url, 512)),
            num_images: 1,
          }),
        });

        if (!res.ok) {
          const text = await res.text();
          if (attempt < MAX_RETRIES && RETRYABLE_STATUS.has(res.status)) {
            throw Object.assign(new Error(`FAL request failed: ${res.status} ${text}`), { status: res.status });
          }
          throw new Error(`FAL request failed: ${res.status} ${text}`);
        }

        const json = await res.json();
        if (!json.images || json.images.length === 0) {
          throw new Error('FAL returned no images');
        }

        for (const img of json.images) {
          const imageUrl = typeof img === 'string' ? img : img.url;
          const s3Url = await fetchAndUploadToS3(imageUrl);
          outputUrls.push(s3Url);
        }
        break;
      } catch (error) {
        lastError = error;
        const status = (error as { status?: number }).status;
        if (attempt < MAX_RETRIES && status && RETRYABLE_STATUS.has(status)) {
          const delay = Math.min(1000 * 2 ** attempt + Math.random() * 500, 15000);
          console.warn(`Fal.ai transient error (attempt ${attempt + 1}/${MAX_RETRIES + 1}), retrying in ${Math.round(delay)}ms...`);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        throw error;
      }
    }
    if (outputUrls.length === 0 && lastError) throw lastError;
  }

  return {
    outputUrls,
    executionTimeMs: Date.now() - start,
    model: req.model,
  };
}
