/**
 * Append CDN optimization query params to image URLs.
 * Supports both catalog CDN and S3-fronted images.
 * Data URLs are left unchanged.
 *
 * @param url   - The image URL
 * @param width - Desired width in pixels (default 256)
 */
export function withImageParams(url: string, width = 256): string {
  if (!url || url.startsWith('data:')) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}w=${width}&f=webp`;
}

/**
 * Normalize a DB product-image value (may be a single text URL or a text[])
 * into a string[]. Handles pre-migration (single string) and post-migration
 * (array) column types gracefully.
 */
export function toUrlArray(val: unknown): string[] {
  if (Array.isArray(val)) return val.filter((v): v is string => typeof v === 'string' && !!v);
  if (typeof val === 'string' && val) return [val];
  return [];
}
