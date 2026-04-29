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

  const res = await fetch(url, {
    method: request.method,
    headers,
    body: body && body.length > 0 ? body : undefined,
  });

  const contentType = res.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');

  if (isJson) {
    const json = await res.json();
    return NextResponse.json(json, { status: res.status });
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

  const responseBody = await res.text();
  return new NextResponse(responseBody, {
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
