import { imageGenerationBase } from '@/lib/env';
import { NextRequest, NextResponse } from 'next/server';

async function proxy(request: NextRequest, pathSegments: string[]) {
  let base: string;
  try {
    base = imageGenerationBase();
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Backend BASE_API_HOSTNAME is not configured' } },
      { status: 502 },
    );
  }

  const path = pathSegments.length > 0 ? pathSegments.join('/') : '';
  const search = request.nextUrl.searchParams.toString();
  const url = `${base}${path ? `/${path}` : ''}${search ? `?${search}` : ''}`;

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (lower === 'accept' || lower === 'content-type' || lower === 'authorization' || lower.startsWith('x-')) {
      headers.set(key, value);
    }
  });

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
    if (lower === 'content-type' || lower === 'content-length' || lower === 'cache-control' || lower.startsWith('x-')) {
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

export async function GET(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await params;
  return proxy(request, path);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await params;
  return proxy(request, path);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await params;
  return proxy(request, path);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await params;
  return proxy(request, path);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await params;
  return proxy(request, path);
}
