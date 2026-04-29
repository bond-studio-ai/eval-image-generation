/**
 * Centralized access to BASE_API_HOSTNAME + per-service base URLs.
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

/**
 * Base URL for the catalog-feed service's calibrated-confidence admin
 * API. Defaults to the same hostname as the image-generation service but
 * can be overridden via CATALOG_FEED_BASE_HOSTNAME when the two services
 * live behind different gateways (e.g. local dev vs staging).
 */
export function catalogFeedBase(): string {
  const override = process.env.CATALOG_FEED_BASE_HOSTNAME;
  const host = override ? override.replace(/\/$/, '') : raw();
  return `${host}/catalog-feed/v1`;
}

/**
 * Optional bearer token injected into every proxied admin request. The
 * catalog-feed admin API is auth-wrapped at the service layer; the UI
 * runs behind Clerk so a single shared service token is sufficient for
 * server-to-server calls. Returns an empty string when not configured.
 */
export function catalogFeedAdminToken(): string {
  return process.env.CATALOG_FEED_ADMIN_TOKEN ?? '';
}
