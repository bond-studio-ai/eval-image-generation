import { randomUUID } from 'crypto';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { GenerateRequest, GenerateResponse, ModelProvider } from '../types';

const s3 = new S3Client({
  region: process.env.AWS_S3_REGION || 'us-west-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.AWS_S3_BUCKET!;

async function uploadBase64ToS3(base64: string, mimeType: string): Promise<string> {
  const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'png';
  const key = `evals/outputs/${randomUUID()}.${ext}`;
  const buffer = Buffer.from(base64, 'base64');

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    }),
  );

  return `https://${BUCKET}.s3.${process.env.AWS_S3_REGION || 'us-west-2'}.amazonaws.com/${key}`;
}

async function urlToBase64(url: string): Promise<{ base64: string; mimeType: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch FAL output image: ${url}`);

  const mimeType = res.headers.get('content-type') || 'image/jpeg';
  const buffer = await res.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');

  return { base64, mimeType };
}

export class SeedreamProvider implements ModelProvider {
  private apiKey = process.env.SEEDREAM_API_KEY!;
  private apiHost = 'https://fal.run';

  async generate(req: GenerateRequest): Promise<GenerateResponse> {
    if (!this.apiKey) throw new Error('SEEDREAM_API_KEY not set');
    if (!req.inputImages?.length) {
      throw new Error('Seedream requires at least one input image');
    }

    const start = Date.now();

    const prompt = this.buildPrompt(req);

    // FAL model path — confirm exact slug in FAL dashboard
    const endpoint = `${this.apiHost}/fal-ai/bytedance/seedream/v4.5/edit`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Key ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        image_urls: req.inputImages.map((i) => i.url),
        num_images: 1,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`FAL request failed: ${res.status} ${text}`);
    }

    const json = await res.json();

    if (!json.images || json.images.length === 0) {
      throw new Error('FAL returned no images');
    }

    const outputUrls: string[] = [];

    for (const img of json.images) {
      const imageUrl = typeof img === 'string' ? img : img.url;

      const { base64, mimeType } = await urlToBase64(imageUrl);
      const s3Url = await uploadBase64ToS3(base64, mimeType);
      outputUrls.push(s3Url);
    }

    return {
      outputUrls,
      executionTimeMs: Date.now() - start,
      model: 'fal-ai/bytedance/seedream/v4.5/edit',
    };
  }

  private buildPrompt(req: GenerateRequest): string {
    if (req.tagImages === false) return req.userPrompt;

    const imageContext = req.inputImages
      .map((img, i) => `Reference image ${i + 1} (${img.label})`)
      .join('\n');

    return `${req.systemPrompt || ''}

${imageContext}

${req.userPrompt}`;
  }
}
