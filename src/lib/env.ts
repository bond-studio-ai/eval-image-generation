/**
 * Centralized access to BASE_API_HOSTNAME + per-service base URLs.
 * Server-only — never import in client components.
 */

function raw(): string {
  const hostname = process.env.BASE_API_HOSTNAME;
  if (!hostname) throw new Error("BASE_API_HOSTNAME is not set");
  return hostname.replace(/\/$/, "");
}

/** Base URL for the image-generation service (e.g. "https://api.example.com/image-generation/v1"). */
export function imageGenerationBase(): string {
  return `${raw()}/image-generation/v1`;
}

/** Base URL for the v2 image-generation service API. */
export function imageGenerationV2Base(): string {
  return `${raw()}/image-generation/v2`;
}

/** Base URL for the platform API, protocol-normalized to https. */
export function platformApiBase(): string {
  return `https://${raw().replace(/^https?:\/\//, "")}`;
}

export interface S3UploadConfig {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export function s3UploadConfig(): S3UploadConfig {
  const bucket = process.env.AWS_S3_BUCKET;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.AWS_S3_REGION || "us-west-2";

  if (!bucket || !accessKeyId || !secretAccessKey) {
    const missing = [
      ["AWS_S3_BUCKET", bucket],
      ["AWS_ACCESS_KEY_ID", accessKeyId],
      ["AWS_SECRET_ACCESS_KEY", secretAccessKey]
    ]
      .filter(([, value]) => !value)
      .map(([key]) => key);
    throw new Error(`Missing S3 upload configuration: ${missing.join(", ")}`);
  }

  return {
    bucket,
    region,
    accessKeyId,
    secretAccessKey
  };
}
