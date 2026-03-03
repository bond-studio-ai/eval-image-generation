import { errorResponse, successResponse } from '@/lib/api-response';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

function getS3Client(): S3Client {
  return new S3Client({
    region: process.env.AWS_S3_REGION || 'us-west-2',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      filename: string;
      contentType: string;
      size?: number;
    };

    if (!body.filename || !body.contentType) {
      return errorResponse('VALIDATION_ERROR', 'filename and contentType are required');
    }

    if (!ALLOWED_TYPES.includes(body.contentType)) {
      return errorResponse(
        'VALIDATION_ERROR',
        `Invalid file type. Allowed: ${ALLOWED_TYPES.join(', ')}`,
      );
    }

    if (body.size && body.size > MAX_SIZE) {
      return errorResponse('VALIDATION_ERROR', 'File too large. Maximum size is 10MB');
    }

    const bucket = process.env.AWS_S3_BUCKET;
    if (!bucket) {
      return errorResponse('INTERNAL_ERROR', 'AWS_S3_BUCKET is not configured');
    }

    const region = process.env.AWS_S3_REGION || 'us-west-2';
    const ext = body.filename.split('.').pop() || 'jpg';
    const key = `evals/uploads/${randomUUID()}.${ext}`;

    const client = getS3Client();
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: body.contentType,
    });

    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 300 });
    const publicUrl = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;

    return successResponse({ uploadUrl, publicUrl, key });
  } catch (error) {
    console.error('Error generating upload URL:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to generate upload URL');
  }
}
