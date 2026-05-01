import { catalogFeedAdminToken, catalogFeedBase } from '@/lib/env';
import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Thin server-side proxy to the catalog-feed calibrated-confidence admin
 * API. The proxy injects a shared service bearer token so the upstream
 * admin endpoints can stay auth-gated, but `/api/**` is explicitly
 * excluded from the Clerk middleware matcher in `src/proxy.ts`. That
 * means the route handler itself must verify the caller is signed in
 * before forwarding the request — otherwise an unauthenticated client
 * could borrow the server token and perform privileged admin actions
 * upstream.
 *
 * Path mapping:
 *   UI           /api/v1/catalog-feed/admin/runs?scope=tear_sheet
 *   Upstream     {catalogFeedBase}/admin/runs?scope=tear_sheet
 */
async function proxy(request: NextRequest, pathSegments: string[]) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      {
        error: {
          code: 'UNAUTHORIZED',
          message: 'Sign in is required to access the catalog-feed admin API.',
        },
      },
      { status: 401 },
    );
  }

  let base: string;
  try {
    base = catalogFeedBase();
  } catch {
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Catalog-feed base URL is not configured',
        },
      },
      { status: 502 },
    );
  }

  const path = pathSegments.length > 0 ? pathSegments.join('/') : '';
  const search = request.nextUrl.searchParams.toString();
  const url = `${base}${path ? `/${path}` : ''}${search ? `?${search}` : ''}`;

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (
      lower === 'accept' ||
      lower === 'content-type' ||
      lower === 'authorization' ||
      lower.startsWith('x-')
    ) {
      headers.set(key, value);
    }
  });

  const adminToken = catalogFeedAdminToken();
  if (adminToken && !headers.has('authorization')) {
    headers.set('authorization', `Bearer ${adminToken}`);
  }

  let body: string | undefined;
  try {
    body = await request.text();
  } catch {
    // no body
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method: request.method,
      headers,
      body: body && body.length > 0 ? body : undefined,
    });
  } catch (err) {
    // Network-level failure (DNS, TLS, refused connection). Surface
    // both to Next stdout and to the browser so the reviewer sees the
    // root cause instead of an opaque "failed to fetch".
    const message = err instanceof Error ? err.message : String(err);
    console.error('catalog-feed proxy network error', {
      method: request.method,
      url,
      error: message,
      bodyLen: body?.length ?? 0,
    });
    return NextResponse.json(
      { error: { code: 'UPSTREAM_NETWORK_ERROR', message, url } },
      { status: 502 },
    );
  }

  const contentType = res.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');

  // Read the body as text first so we can both forward it and log it
  // on non-2xx without consuming the stream twice. JSON branches still
  // get a real JSON response (best-effort parsed) so existing callers
  // that read .json() keep working.
  const rawBody = await res.text().catch(() => '');

  if (!res.ok) {
    // Mirror the catalog-feed structured error to Next stdout so we
    // can diagnose 4xx/5xx without poking at the browser network tab.
    // The reviewer's "Submit review" button shows the upstream body
    // verbatim today, but adding the server log closes the visibility
    // gap when the upstream returns an HTML 5xx instead of JSON (e.g.
    // when the proxy can't reach the service at all but TLS succeeds).
    console.error('catalog-feed proxy upstream error', {
      method: request.method,
      url,
      status: res.status,
      contentType,
      bodySnippet: rawBody.slice(0, 600),
    });
  }

  if (isJson) {
    if (rawBody.length === 0) {
      return NextResponse.json({}, { status: res.status });
    }
    try {
      const parsed = JSON.parse(rawBody);
      return NextResponse.json(parsed, { status: res.status });
    } catch (err) {
      // The upstream said `application/json` but produced invalid
      // bytes. We deliberately upgrade the response to 502 here even
      // when the upstream status was 2xx — every browser caller
      // gates on `res.ok`, so passing through a 2xx with an
      // `UPSTREAM_BAD_JSON` envelope would silently mask a write
      // failure (e.g. the inline review form would clear and
      // refresh as if the verdict landed). 502 forces the FE error
      // path to run; the original upstream status is preserved in
      // the body for debugging.
      console.error('catalog-feed proxy JSON parse failed', {
        url,
        upstreamStatus: res.status,
        error: err instanceof Error ? err.message : String(err),
        bodySnippet: rawBody.slice(0, 300),
      });
      return NextResponse.json(
        {
          error: {
            code: 'UPSTREAM_BAD_JSON',
            message: 'Upstream returned malformed JSON',
            upstreamStatus: res.status,
            bodySnippet: rawBody.slice(0, 300),
          },
        },
        { status: 502 },
      );
    }
  }

  const responseHeaders = new Headers();
  res.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (
      lower === 'content-type' ||
      lower === 'content-length' ||
      lower === 'cache-control' ||
      lower.startsWith('x-')
    ) {
      responseHeaders.set(key, value);
    }
  });

  return new NextResponse(rawBody, {
    status: res.status,
    statusText: res.statusText,
    headers: responseHeaders,
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  const { path = [] } = await params;
  return proxy(request, path);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  const { path = [] } = await params;
  return proxy(request, path);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  const { path = [] } = await params;
  return proxy(request, path);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  const { path = [] } = await params;
  return proxy(request, path);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  const { path = [] } = await params;
  return proxy(request, path);
}
