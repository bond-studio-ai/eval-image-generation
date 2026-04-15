import { platformApiBase } from '@/lib/env';
import { errorResponse, successResponse } from '@/lib/api-response';

const RETAILER_ID_QUERY_KEY = 'retailerId';

export async function GET(request: Request) {
  try {
    const STUDIO_API_BASE = `${platformApiBase()}/studio/v1`;

    const requestUrl = new URL(request.url);
    const retailerId = requestUrl.searchParams.get(RETAILER_ID_QUERY_KEY)?.trim();
    const upstreamUrl = new URL(`${STUDIO_API_BASE}/design-packages`);
    upstreamUrl.searchParams.append('useUUIDs', '');
    if (retailerId) {
      upstreamUrl.searchParams.set(RETAILER_ID_QUERY_KEY, retailerId);
    }

    const res = await fetch(upstreamUrl.toString(), {
      headers: { Accept: 'application/json' },
      next: { revalidate: 600 },
    });

    if (!res.ok) {
      return errorResponse('INTERNAL_ERROR', `Design packages API returned ${res.status}`);
    }

    const json = (await res.json()) as { data?: unknown };
    return successResponse(Array.isArray(json.data) ? json.data : json.data ?? json);
  } catch (error) {
    console.error('Error fetching design packages:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch design packages');
  }
}
