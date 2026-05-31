/**
 * Await a promise, resolving to `null` if it rejects. Keeps the common
 * server-component "fetch-or-notFound" call sites flat without a trailing
 * `.catch(() => null)` then-chain.
 */
export async function catchToNull<T>(promise: Promise<T>): Promise<T | null> {
  try {
    return await promise;
  } catch {
    return null;
  }
}

/**
 * Parse a `Request`/`Response` body as JSON, resolving to `{}` when the body
 * is missing or not valid JSON. Mirrors the previous `res.json().catch(() => ({}))`
 * idiom used across the fetch wrappers.
 */
export async function parseJsonOrEmpty(source: Request | Response): Promise<unknown> {
  try {
    const json: unknown = await source.json();
    return json;
  } catch {
    return {};
  }
}
