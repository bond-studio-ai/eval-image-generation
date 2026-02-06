import { errorResponse, successResponse } from '@/lib/api-response';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
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
    const body = await request.json();
    const { filename, contentType, size } = body as {
      filename: string;
      contentType: string;
      size: number;
    };

    if (!filename || !contentType) {
      return errorResponse('VALIDATION_ERROR', 'filename and contentType are required');
    }

    if (!ALLOWED_TYPES.includes(contentType)) {
      return errorResponse('VALIDATION_ERROR', `Invalid file type. Allowed: ${ALLOWED_TYPES.join(', ')}`);
    }

    if (size && size > MAX_SIZE) {
      return errorResponse('VALIDATION_ERROR', 'File too large. Maximum size is 10MB');
    }

    // Generate unique S3 key
    const ext = filename.split('.').pop() || 'jpg';
    const key = `uploads/${randomUUID()}.${ext}`;

    // Generate presigned upload URL
    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 }); // 5 min expiry
    const publicUrl = `https://${BUCKET}.s3.${process.env.AWS_S3_REGION || 'us-west-2'}.amazonaws.com/${key}`;

    return successResponse({ uploadUrl, publicUrl, key });
  } catch (error) {
    console.error('Error generating upload URL:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to generate upload URL');
  }
}
