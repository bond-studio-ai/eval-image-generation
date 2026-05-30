const SERVICE_PROXY_PREFIX = "/api/v1/image-generation";
const SERVICE_V2_PROXY_PREFIX = "/api/v1/image-generation-v2";

/** URL for a path that should be proxied to the image-generation v1 service. */
export function serviceUrl(path: string): string {
  const p = path.startsWith("/") ? path.slice(1) : path;
  return `${SERVICE_PROXY_PREFIX}/${p}`;
}

/** URL for a path that should be proxied to the image-generation v2 service. */
export function serviceV2Url(path: string): string {
  const p = path.startsWith("/") ? path.slice(1) : path;
  return `${SERVICE_V2_PROXY_PREFIX}/${p}`;
}

/** URL for a local eval-app API route (upload, products, catalog). */
export function localUrl(path: string): string {
  const p = path.startsWith("/") ? path.slice(1) : path;
  return `/api/v1/${p}`;
}

/** The browser's IANA timezone (e.g. "America/Los_Angeles"). */
export function browserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "";
  }
}
