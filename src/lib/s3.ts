import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

const s3 = new S3Client({
  region: process.env.AWS_S3_REGION || 'us-west-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.AWS_S3_BUCKET!;

export async function uploadBase64ToS3(base64: string, mimeType: string): Promise<string> {
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

/**
 * Fetch a remote image, re-upload it to S3, and return the permanent S3 URL.
 * Useful for persisting temporary URLs from external providers.
 */
export async function fetchAndUploadToS3(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch image (${res.status}): ${url.substring(0, 200)}`);
  }
  const contentType = res.headers.get('content-type') || 'image/png';
  const buffer = await res.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');
  return uploadBase64ToS3(base64, contentType);
}
