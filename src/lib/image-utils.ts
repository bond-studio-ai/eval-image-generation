/**
 * Append CDN optimization query params to image URLs.
 * The catalog CDN requires these params to serve images.
 * S3 URLs and data URLs are left unchanged.
 */
export function withImageParams(url: string): string {
  if (!url || url.startsWith('data:') || url.includes('.amazonaws.com')) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}w=256&f=webp`;
}
