import { errorResponse, successResponse } from '@/lib/api-response';
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
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return errorResponse('VALIDATION_ERROR', 'file is required');
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return errorResponse('VALIDATION_ERROR', `Invalid file type. Allowed: ${ALLOWED_TYPES.join(', ')}`);
    }

    if (file.size > MAX_SIZE) {
      return errorResponse('VALIDATION_ERROR', 'File too large. Maximum size is 10MB');
    }

    const ext = file.name.split('.').pop() || 'jpg';
    const key = `evals/uploads/${randomUUID()}.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: buffer,
        ContentType: file.type,
        ACL: 'public-read',
      }),
    );

    const publicUrl = `https://${BUCKET}.s3.${process.env.AWS_S3_REGION || 'us-west-2'}.amazonaws.com/${key}`;

    return successResponse({ publicUrl, key });
  } catch (error) {
    console.error('Error uploading file:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to upload file');
  }
}
