import { errorResponse } from '@/lib/api-response';
import { platformApiBase } from '@/lib/env';
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const PROJECTS_BASE = `${platformApiBase()}/v2/projects`;

const FORWARDED_KEYS = ['format[]', 'include[]'] as const;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return errorResponse('UNAUTHORIZED', 'Sign in is required to access the projects API.');
  }

  try {
    const { projectId } = await params;
    const incoming = new URL(request.url).searchParams;
    const forwarded = new URLSearchParams();
    for (const key of FORWARDED_KEYS) {
      for (const value of incoming.getAll(key)) {
        forwarded.append(key, value);
      }
    }
    const qs = forwarded.toString();
    const upstreamUrl = `${PROJECTS_BASE}/${encodeURIComponent(projectId)}` + (qs ? `?${qs}` : '');

    const res = await fetch(upstreamUrl, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      return errorResponse('INTERNAL_ERROR', `Projects API returned ${res.status}`);
    }

    // Pass the upstream body through unchanged; it already wraps the project in
    // `{ data: [project] }`, so the only thing an extra `successResponse` wrapper
    // would buy us is a confusing second `.data` to unwrap on the client.
    const json: unknown = await res.json();
    return NextResponse.json(json, { status: 200 });
  } catch (err) {
    console.error('[project detail] Error:', err);
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch project details');
  }
}
