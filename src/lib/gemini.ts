import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { GenerateContentConfig, GoogleGenAI, type Content } from '@google/genai';
import { randomUUID } from 'crypto';
import { withImageParams } from './image-utils';

// ------------------------------------
// Types
// ------------------------------------

/** Single input image with an optional label so Gemini knows what it represents (e.g. product type or "scene"). */
export interface LabeledInputImage {
  url: string;
  label: string;
}

export interface GeminiGenerateRequest {
  systemPrompt: string;
  userPrompt: string;
  model: string;
  /** Input images with labels (e.g. "Faucet", "Dollhouse view") so the model knows what each image is. */
  inputImages: LabeledInputImage[];
  aspectRatio?: string;
  imageSize?: string; // "1K", "2K", "4K"
  temperature?: number;
  numberOfImages?: number; // number of sequential API calls
  useGoogleSearch?: boolean; // Grounding with Google Search
  tagImages?: boolean; // prepend "Reference image (label):" before each image (default true)
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
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Failed to fetch image (${res.status} ${res.statusText}): ${url.substring(0, 200)}${body ? ` — ${body.substring(0, 200)}` : ''}`);
  }

  const contentType = res.headers.get('content-type') || 'image/jpeg';
  const buffer = await res.arrayBuffer();
  if (buffer.byteLength === 0) {
    throw new Error(`Image fetch returned empty body: ${url.substring(0, 200)}`);
  }
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
// Retry with backoff
// ------------------------------------

const MAX_RETRIES = 3;
const RETRYABLE_CODES = new Set([429, 500, 502, 503]);

function isRetryable(error: unknown): boolean {
  const err = error as Record<string, unknown>;
  const status =
    (typeof err?.status === 'number' ? err.status : null) ??
    (typeof err?.statusCode === 'number' ? err.statusCode : null) ??
    (typeof (err?.error as Record<string, unknown>)?.code === 'number'
      ? (err.error as Record<string, unknown>).code as number
      : null);
  return status != null && RETRYABLE_CODES.has(status);
}

async function retryWithBackoff<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < MAX_RETRIES && isRetryable(error)) {
        const delay = Math.min(1000 * 2 ** attempt + Math.random() * 500, 15000);
        console.warn(`Gemini transient error (attempt ${attempt + 1}/${MAX_RETRIES + 1}), retrying in ${Math.round(delay)}ms...`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
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
  const imageData = await Promise.all(
    req.inputImages.map(({ url }) => urlToBase64(url)),
  );

  // Build the contents array: optionally label each image so Gemini knows what it is, then the user prompt
  const shouldTag = req.tagImages !== false; // default true
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userParts: any[] = [];
  for (let i = 0; i < imageData.length; i++) {
    if (shouldTag) {
      const label = req.inputImages[i].label;
      userParts.push({
        text: `Reference image (${label}):`,
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

  const callGemini = () =>
    ai.models.generateContent({ model: req.model, contents, config: apiConfig });

  try {
    const results = await Promise.all(
      Array.from({ length: numImages }, () => retryWithBackoff(callGemini)),
    );

    const outputUrls: string[] = [];
    let textResponse: string | undefined;

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
  } catch (error) {
    const details = extractErrorDetails(error, req, imageData);
    console.error('Gemini generation failed:', details.logMessage);
    throw new Error(details.userMessage);
  }
}

function extractErrorDetails(
  error: unknown,
  req: GeminiGenerateRequest,
  imageData: { base64: string; mimeType: string }[],
): { logMessage: string; userMessage: string } {
  const lines: string[] = [];

  // Request context
  lines.push(`Model: ${req.model}`);
  lines.push(`Images: ${req.inputImages.length} (${imageData.map((d, i) => `${req.inputImages[i]?.label}: ${(d.base64.length * 0.75 / 1024 / 1024).toFixed(2)}MB ${d.mimeType}`).join(', ')})`);
  if (req.aspectRatio) lines.push(`Aspect ratio: ${req.aspectRatio}`);
  if (req.imageSize) lines.push(`Image size: ${req.imageSize}`);
  if (req.temperature != null) lines.push(`Temperature: ${req.temperature}`);

  // Error details
  let userMessage = 'Gemini API call failed';
  const err = error as Record<string, unknown>;

  if (err && typeof err === 'object') {
    const status = err.status ?? err.statusCode ?? (err.error as Record<string, unknown>)?.code;
    const statusMessage = err.statusMessage ?? (err.error as Record<string, unknown>)?.status;
    const message = err.message ?? (err.error as Record<string, unknown>)?.message;
    const errorDetails = err.errorDetails ?? (err.error as Record<string, unknown>)?.details;

    if (status) lines.push(`Status: ${status}`);
    if (statusMessage) lines.push(`Status message: ${statusMessage}`);
    if (message) lines.push(`Message: ${message}`);
    if (errorDetails) lines.push(`Details: ${JSON.stringify(errorDetails)}`);

    // Build a readable user-facing message
    const parts: string[] = [];
    if (status) parts.push(`${status}`);
    if (statusMessage) parts.push(`${statusMessage}`);
    if (typeof message === 'string') {
      try {
        const parsed = JSON.parse(message);
        parts.push(parsed?.error?.message ?? message);
      } catch {
        parts.push(message);
      }
    }
    if (parts.length > 0) userMessage = parts.join(' - ');
  } else if (error instanceof Error) {
    lines.push(`Error: ${error.message}`);
    userMessage = error.message;
  } else {
    lines.push(`Error: ${String(error)}`);
  }

  return { logMessage: lines.join('\n  '), userMessage };
}
