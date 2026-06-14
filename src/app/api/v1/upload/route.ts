import { randomUUID } from "node:crypto";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import bytes from "bytes";
import { errorResponse, successResponse } from "@/lib/api-response";
import { authenticatedUserId } from "@/lib/auth";
import { s3UploadConfig } from "@/lib/env";
import { logger } from "@/lib/logger";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// `bytes` returns `number | null`; a null can only mean the literal is malformed,
// which is a programmer error — fail loudly rather than silently capping at 0
// (which would reject every upload).
function parseSize(literal: string): number {
  const parsed = bytes(literal);
  if (parsed == null) throw new Error(`Invalid byte-size literal: ${literal}`);
  return parsed;
}

const MAX_SIZE = parseSize("10MB");

export async function POST(request: Request) {
  try {
    const userId = await authenticatedUserId();
    if (!userId) {
      return errorResponse("UNAUTHORIZED", "Sign in is required to upload images");
    }

    const config = s3UploadConfig();
    const s3 = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey
      }
    });

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return errorResponse("VALIDATION_ERROR", "file is required");
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return errorResponse("VALIDATION_ERROR", `Invalid file type. Allowed: ${ALLOWED_TYPES.join(", ")}`);
    }

    if (file.size > MAX_SIZE) {
      return errorResponse("VALIDATION_ERROR", "File too large. Maximum size is 10MB");
    }

    const ext = file.name.split(".").pop() || "jpg";
    const key = `evals/uploads/${randomUUID()}.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    await s3.send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: key,
        Body: buffer,
        ContentType: file.type
      })
    );

    const publicUrl = `https://${config.bucket}.s3.${config.region}.amazonaws.com/${key}`;

    return successResponse({ publicUrl, key });
  } catch (error) {
    logger.error("Error uploading file:", error);
    return errorResponse("INTERNAL_ERROR", "Failed to upload file");
  }
}
