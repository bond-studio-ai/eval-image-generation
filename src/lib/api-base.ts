/**
 * All image-generation API calls go through the Next.js proxy at /api/v1/image-generation/*.
 * The proxy runs on the server and forwards to the backend (BASE_API_HOSTNAME). No client-side
 * calls are made directly to the backend.
 */
const IMAGE_GENERATION_PROXY_PREFIX = '/api/v1/image-generation';

export function getImageGenerationApiBase(): string {
  return IMAGE_GENERATION_PROXY_PREFIX;
}

export const IMAGE_GENERATION_V1 = IMAGE_GENERATION_PROXY_PREFIX;

/** URL for a path under the image-generation API (path without leading slash). Uses the same-origin proxy. */
export function imageGenerationApiUrl(path: string): string {
  const p = path.startsWith('/') ? path.slice(1) : path;
  return `${IMAGE_GENERATION_PROXY_PREFIX}/${p}`;
}

/** Same-origin eval app API (products, catalog). Path is relative to /api/v1 (no leading slash). */
export function evalApiUrl(path: string): string {
  const p = path.startsWith('/') ? path.slice(1) : path;
  return `/api/v1/${p}`;
}
