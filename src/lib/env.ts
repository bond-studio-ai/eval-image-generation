/**
 * Centralized access to BASE_API_HOSTNAME.
 * Server-only — never import in client components.
 */

function raw(): string {
  const v = process.env.BASE_API_HOSTNAME;
  if (!v) throw new Error('BASE_API_HOSTNAME is not set');
  return v.replace(/\/$/, '');
}

/** Base URL for the image-generation service (e.g. "https://api.example.com/image-generation/v1"). */
export function imageGenerationBase(): string {
  return `${raw()}/image-generation/v1`;
}

/** Base URL for the platform API, protocol-normalized to https. */
export function platformApiBase(): string {
  return `https://${raw().replace(/^https?:\/\//, '')}`;
}
