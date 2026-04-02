import { errorResponse, successResponse } from '@/lib/api-response';

const PROJECTS_BASE = 'https://api.usedemo.io/v2/projects';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;
    const res = await fetch(`${PROJECTS_BASE}/${encodeURIComponent(projectId)}`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      return errorResponse('INTERNAL_ERROR', `Projects API returned ${res.status}`);
    }

    const json = await res.json();
    return successResponse(json);
  } catch (err) {
    console.error('[project detail] Error:', err);
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch project details');
  }
}
