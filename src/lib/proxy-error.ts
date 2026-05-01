/**
 * extractUpstreamError pulls a human-readable message out of a non-2xx
 * response coming back through the `/api/v1/catalog-feed` proxy. The
 * upstream catalog-feed admin API uses huma's RFC 7807-ish error
 * shape:
 *
 *   {
 *     "$schema": "https://api.bondstudio.ai/.../ErrorModel.json",
 *     "title":   "Internal Server Error",
 *     "status":  500,
 *     "detail":  "submit review",
 *     "errors":  [{ "message": "..." }]
 *   }
 *
 * The proxy itself can also wrap the response with its own
 * `{ error: { code, message } }` envelope on network/parse failures.
 *
 * We try, in order:
 *   1. Proxy envelope `error.message` (top-level).
 *   2. Huma `errors[*].message` joined.
 *   3. Huma `detail` + `title`.
 *   4. The raw text body, truncated.
 *
 * The fallback is intentionally truncated so an HTML 502 error page
 * doesn't blow out the toast/banner.
 */
export async function extractUpstreamError(res: Response): Promise<string> {
  const text = await res.text().catch(() => '');
  if (!text) return `${res.status} ${res.statusText || 'Error'}`;

  let parsed: unknown = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    // not JSON; fall through to the truncated raw text below
  }

  if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>;

    // Proxy-wrapped error envelope.
    const proxyErr = obj.error;
    if (proxyErr && typeof proxyErr === 'object') {
      const m = (proxyErr as Record<string, unknown>).message;
      if (typeof m === 'string' && m.length > 0) {
        return `${res.status}: ${m}`;
      }
    }

    // Huma errors array.
    const errors = obj.errors;
    if (Array.isArray(errors) && errors.length > 0) {
      const messages = errors
        .map((e) =>
          e && typeof e === 'object' && typeof (e as Record<string, unknown>).message === 'string'
            ? ((e as Record<string, unknown>).message as string)
            : null,
        )
        .filter((m): m is string => !!m && m.length > 0);
      if (messages.length > 0) {
        return `${res.status}: ${messages.join('; ')}`;
      }
    }

    // Huma title/detail fallback.
    const detail = typeof obj.detail === 'string' ? obj.detail : '';
    const title = typeof obj.title === 'string' ? obj.title : '';
    if (detail || title) {
      const combined = [title, detail].filter((s) => s && s.length > 0).join(': ');
      return `${res.status}: ${combined}`;
    }
  }

  return `${res.status}: ${text.slice(0, 300)}`;
}
