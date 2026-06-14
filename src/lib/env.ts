/**
 * Centralized access to BASE_API_HOSTNAME + per-service base URLs.
 * Server-only — never import in client components.
 */

function raw(): string {
  const hostname = process.env.BASE_API_HOSTNAME;
  if (!hostname) throw new Error("BASE_API_HOSTNAME is not set");
  return hostname.replace(/\/$/, "");
}

const HTTP_PROTOCOL = "http:";
const HTTPS_PROTOCOL = "https:";
const HTTP_PREFIX = `${HTTP_PROTOCOL}//`;
const HTTPS_PREFIX = `${HTTPS_PROTOCOL}//`;
const LOCAL_HTTP_HOSTS = new Set(["127.0.0.1", "::1", "localhost"]);

function isLocalHttpOrigin(url: URL): boolean {
  return url.protocol === HTTP_PROTOCOL && LOCAL_HTTP_HOSTS.has(url.hostname);
}

function apiOrigin(): string {
  const value = raw();
  if (value.startsWith(HTTPS_PREFIX)) return value;
  if (value.startsWith(HTTP_PREFIX)) {
    const url = new URL(value);
    if (isLocalHttpOrigin(url)) return url.origin;
    url.protocol = HTTPS_PROTOCOL;
    return url.origin;
  }
  return `${HTTPS_PREFIX}${value}`;
}

/** Base URL for the image-generation service (e.g. "https://api.example.com/image-generation/v1"). */
export function imageGenerationBase(): string {
  return `${apiOrigin()}/image-generation/v1`;
}

/** Base URL for the v2 image-generation service API. */
export function imageGenerationV2Base(): string {
  return `${apiOrigin()}/image-generation/v2`;
}

/** Base URL for the platform API. Non-local http origins are upgraded to https. */
export function platformApiBase(): string {
  return apiOrigin();
}

/** Base URL for catalog product routes. */
export function catalogProductsBase(): string {
  return `${platformApiBase()}/catalog/v3/products`;
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
