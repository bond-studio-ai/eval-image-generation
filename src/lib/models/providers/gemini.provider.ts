import { randomUUID } from 'crypto';
import { withImageParams } from '@/lib/image-utils';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { GenerateContentConfig, GoogleGenAI, type Content } from '@google/genai';
import { GenerateRequest, GenerateResponse, ModelProvider } from '../types';

const s3 = new S3Client({
  region: process.env.AWS_S3_REGION || 'us-west-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.AWS_S3_BUCKET!;

const S3_HOST_PATTERN = /^(https?:\/\/)[^/]+\.s3\.[^/]+\.amazonaws\.com\//;
const CDN_HOST = 'https://cdn.arcstudio.ai/';

function toCdnUrl(url: string): string {
  return url.replace(S3_HOST_PATTERN, CDN_HOST);
}

async function urlToBase64(url: string): Promise<{ base64: string; mimeType: string }> {
  if (url.startsWith('data:')) {
    const match = url.match(/^data:(image\/\w+);base64,(.+)$/);
    if (match) return { mimeType: match[1], base64: match[2] };
    throw new Error(`Invalid data URL format`);
  }

  const fetchUrl = withImageParams(toCdnUrl(url));
  const res = await fetch(fetchUrl);
  if (!res.ok) throw new Error(`Failed to fetch image: ${url}`);

  const contentType = res.headers.get('content-type') || 'image/jpeg';
  const buffer = await res.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');

  return { base64, mimeType: contentType };
}

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

export class GeminiProvider implements ModelProvider {
  async generate(req: GenerateRequest): Promise<GenerateResponse> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY not set');

    const ai = new GoogleGenAI({ apiKey });
    const start = Date.now();

    const imageData = await Promise.all(req.inputImages.map(({ url }) => urlToBase64(url)));

    const shouldTag = req.tagImages !== false;
    const userParts: any[] = [];

    for (let i = 0; i < imageData.length; i++) {
      if (shouldTag) {
        userParts.push({
          text: `Reference image (${req.inputImages[i].label}):`,
        });
      }

      userParts.push({
        inlineData: {
          mimeType: imageData[i].mimeType,
          data: imageData[i].base64,
        },
      });
    }

    userParts.push({ text: req.userPrompt });

    const contents: Content[] = [
      {
        role: 'user',
        parts: userParts,
      },
    ];

    const imageConfig: GenerateContentConfig['imageConfig'] = {};
    if (req.aspectRatio) imageConfig.aspectRatio = req.aspectRatio;
    if (req.imageSize) imageConfig.imageSize = req.imageSize;

    const apiConfig: GenerateContentConfig = {
      systemInstruction: req.systemPrompt,
      responseModalities: ['TEXT', 'IMAGE'],
      ...(req.temperature != null && { temperature: req.temperature }),
      ...(Object.keys(imageConfig).length > 0 && { imageConfig }),
      ...(req.useGoogleSearch && { tools: [{ googleSearch: {} }] }),
    };

    const numImages = Math.max(1, Math.min(req.numberOfImages ?? 1, 4));

    const results = await Promise.all(
      Array.from({ length: numImages }, () =>
        ai.models.generateContent({
          model: req.model,
          contents,
          config: apiConfig,
        }),
      ),
    );

    const outputUrls: string[] = [];
    let textResponse: string | undefined;

    for (const response of results) {
      const parts = response.candidates?.[0]?.content?.parts ?? [];
      for (const part of parts) {
        if (part.inlineData?.data) {
          const url = await uploadBase64ToS3(
            part.inlineData.data,
            part.inlineData.mimeType || 'image/png',
          );
          outputUrls.push(url);
        } else if (part.text) {
          textResponse = (textResponse ?? '') + part.text;
        }
      }
    }

    return {
      outputUrls,
      executionTimeMs: Date.now() - start,
      model: req.model,
      textResponse,
    };
  }
}
