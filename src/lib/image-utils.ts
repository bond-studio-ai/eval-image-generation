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
