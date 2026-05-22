import { imageGenerationBase } from '@/lib/env';
import { proxyUpstream } from '@/lib/proxy-handler';
import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

async function proxy(request: NextRequest, pathSegments: string[]) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      {
        error: {
          code: 'UNAUTHORIZED',
          message: 'Sign in is required to access the image-generation API.',
        },
      },
      { status: 401 },
    );
  }

  let base: string;
  try {
    base = imageGenerationBase();
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Backend BASE_API_HOSTNAME is not configured' } },
      { status: 502 },
    );
  }

  return proxyUpstream({ request, pathSegments, baseUrl: base, serviceName: 'image-generation' });
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
