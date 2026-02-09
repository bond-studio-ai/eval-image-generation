import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { GenerateContentConfig, GoogleGenAI, type Content } from '@google/genai';
import { randomUUID } from 'crypto';
import { withImageParams } from './image-utils';

// ------------------------------------
// Types
// ------------------------------------

export interface GeminiGenerateRequest {
  systemPrompt: string;
  userPrompt: string;
  model: string;
  inputImageUrls: string[]; // S3 URLs to convert to base64
  aspectRatio?: string;
  imageSize?: string; // "1K", "2K", "4K"
  temperature?: number;
  numberOfImages?: number; // number of sequential API calls
  useGoogleSearch?: boolean; // Grounding with Google Search
}

export interface GeminiGenerateResponse {
  outputUrls: string[];
  executionTimeMs: number;
  model: string;
  textResponse?: string;
}

// ------------------------------------
// S3 client
// ------------------------------------

const s3 = new S3Client({
  region: process.env.AWS_S3_REGION || 'us-west-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.AWS_S3_BUCKET!;

// ------------------------------------
// Helpers
// ------------------------------------

/**
 * Fetch an image URL and return { base64, mimeType }.
 */
async function urlToBase64(url: string): Promise<{ base64: string; mimeType: string }> {
  const fetchUrl = withImageParams(url);
  const res = await fetch(fetchUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch image: ${fetchUrl} (${res.status})`);
  }

  const contentType = res.headers.get('content-type') || 'image/jpeg';
  const buffer = await res.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');

  return { base64, mimeType: contentType };
}

/**
 * Upload a base64 image to S3 and return the public URL.
 */
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

// ------------------------------------
// Main generation function
// ------------------------------------

export async function generateWithGemini(req: GeminiGenerateRequest): Promise<GeminiGenerateResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }

  const ai = new GoogleGenAI({ apiKey });

  const start = Date.now();

  // Convert all input image URLs to base64
  const imageData = await Promise.all(req.inputImageUrls.map(urlToBase64));

  // Build the contents array for the API call
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userParts: any[] = [{ text: req.userPrompt }];
  for (const img of imageData) {
    userParts.push({
      inlineData: {
        mimeType: img.mimeType,
        data: img.base64,
      },
    });
  }

  const contents: Content[] = [
    {
      role: 'user',
      parts: userParts,
    },
  ];

  // Build imageConfig if aspect ratio or size specified
  const imageConfig: GenerateContentConfig["imageConfig"] = {};
  if (req.aspectRatio) imageConfig.aspectRatio = req.aspectRatio;
  if (req.imageSize) imageConfig.imageSize = req.imageSize;

  const numImages = Math.max(1, Math.min(req.numberOfImages ?? 1, 4));

  const apiConfig: GenerateContentConfig = {
    systemInstruction: req.systemPrompt,
    responseModalities: ['TEXT', 'IMAGE'],
    ...(req.temperature != null && { temperature: req.temperature }),
    ...(Object.keys(imageConfig).length > 0 && { imageConfig }),
    ...(req.useGoogleSearch && { tools: [{ googleSearch: {} }] }),
  };

  // Make concurrent API calls (candidateCount is not supported for image models)
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

  // Upload all output images concurrently
  const uploadPromises: Promise<void>[] = [];

  for (const response of results) {
    if (response.candidates && response.candidates.length > 0) {
      const parts = response.candidates[0].content?.parts ?? [];
      for (const part of parts) {
        if (part.inlineData?.data) {
          uploadPromises.push(
            uploadBase64ToS3(
              part.inlineData.data,
              part.inlineData.mimeType || 'image/png',
            ).then((url) => {
              outputUrls.push(url);
            }),
          );
        } else if (part.text) {
          textResponse = (textResponse ?? '') + part.text;
        }
      }
    }
  }

  await Promise.all(uploadPromises);

  const executionTimeMs = Date.now() - start;

  return {
    outputUrls,
    executionTimeMs,
    model: req.model,
    textResponse,
  };
}
