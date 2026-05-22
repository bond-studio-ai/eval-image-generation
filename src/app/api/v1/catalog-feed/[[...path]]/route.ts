import { catalogFeedAdminToken, catalogFeedBase } from '@/lib/env';
import { proxyUpstream } from '@/lib/proxy-handler';
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

  const adminToken = catalogFeedAdminToken();
  return proxyUpstream({
    request,
    pathSegments,
    baseUrl: base,
    serviceName: 'catalog-feed',
    extraHeaders: adminToken ? { authorization: `Bearer ${adminToken}` } : undefined,
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
