import { errorResponse, successResponse } from '@/lib/api-response';

const baseHostname = process.env.BASE_API_HOSTNAME;
const API_BASE = baseHostname
  ? `https://${baseHostname.replace(/^https?:\/\//, '').replace(/\/$/, '')}`
  : null;
const PROJECTS_BASE = API_BASE ? `${API_BASE}/v2/projects` : null;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    if (!PROJECTS_BASE) {
      return errorResponse('INTERNAL_ERROR', 'BASE_API_HOSTNAME is not set');
    }
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
