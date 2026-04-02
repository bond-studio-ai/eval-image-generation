import { errorResponse, successResponse } from '@/lib/api-response';

const baseHostname = process.env.BASE_API_HOSTNAME;
const API_BASE = baseHostname
  ? `https://${baseHostname.replace(/^https?:\/\//, '').replace(/\/$/, '')}`
  : null;
const STUDIO_API_BASE = API_BASE ? `${API_BASE}/studio/v1` : null;
const SPATIAL_API_BASE = API_BASE ? `${API_BASE}/spatial/v1` : null;
const STUDIO_DESIGN_KEYS = [
  'id',
  'colorScheme',
  'curbTile',
  'curbTilePattern',
  'description',
  'faucet',
  'floorTile',
  'floorTilePattern',
  'imageGenerations',
  'isShowerGlassVisible',
  'isTubDoorVisible',
  'lastUpdatedDateTime',
  'leadTimeDays',
  'lighting',
  'lightingPlacement',
  'materials',
  'mirror',
  'mirrorPlacement',
  'nicheTile',
  'nicheTilePattern',
  'paint',
  'pkgId',
  'renditions',
  'robeHook',
  'shelves',
  'showerFloorTile',
  'showerFloorTilePattern',
  'showerGlass',
  'showerShortWallTile',
  'showerShortWallTilePattern',
  'showerSystem',
  'showerWallTile',
  'showerWallTilePattern',
  'skuCount',
  'startDate',
  'status',
  'style',
  'tags',
  'title',
  'toilet',
  'toiletPaperHolder',
  'totalPrice',
  'towelBar',
  'towelRing',
  'tub',
  'tubDoor',
  'tubFiller',
  'userModified',
  'vanity',
  'wallTile',
  'wallTilePattern',
  'wallTilePlacement',
  'wallpaper',
  'wallpaperPlacement',
] as const;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function sanitizeStudioDesign(design: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of STUDIO_DESIGN_KEYS) {
    const value = design[key];
    if (value !== undefined) out[key] = value;
  }
  return out;
}

function extractRoomLayout(room: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  return asRecord(room?.layout);
}

function extractRoomDesign(room: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  return asRecord(extractRoomLayout(room)?.design);
}

function extractDesignId(value: unknown): string | null {
  const rec = asRecord(value);
  return rec && typeof rec.id === 'string' && rec.id.trim() ? rec.id : null;
}

async function fetchRoomByProjectId(projectId: string): Promise<Record<string, unknown>> {
  if (!SPATIAL_API_BASE) {
    throw new Error('BASE_API_HOSTNAME is not set');
  }
  const res = await fetch(`${SPATIAL_API_BASE}/rooms?projectId=${encodeURIComponent(projectId)}`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Spatial room request failed: ${res.status}`);
  }
  const json = (await res.json()) as { data?: Record<string, unknown>[] };
  const room = Array.isArray(json.data) ? json.data[0] : null;
  if (!room) {
    throw new Error(`No rooms found for project ${projectId}`);
  }
  return room;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    if (!STUDIO_API_BASE || !SPATIAL_API_BASE) {
      return errorResponse('INTERNAL_ERROR', 'BASE_API_HOSTNAME is not set');
    }
    const { projectId } = await params;
    const body = (await request.json().catch(() => ({}))) as { design?: unknown };
    const design =
      body.design && typeof body.design === 'object' && !Array.isArray(body.design)
        ? (body.design as Record<string, unknown>)
        : null;
    if (!design) {
      return errorResponse('VALIDATION_ERROR', 'design is required');
    }

    const sanitized = sanitizeStudioDesign(design);
    if (Object.keys(sanitized).length === 0) {
      return errorResponse('VALIDATION_ERROR', 'design payload is empty');
    }

    const existingRoom = await fetchRoomByProjectId(projectId).catch(() => null);
    const existingDesign = extractRoomDesign(existingRoom);

    if (existingDesign) {
      const designId = extractDesignId(existingDesign);
      const res = await fetch(
        `${STUDIO_API_BASE}/projects/${encodeURIComponent(projectId)}/designs/${encodeURIComponent(designId ?? '')}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sanitized),
          cache: 'no-store',
        },
      );
      if (!res.ok) {
        return errorResponse('INTERNAL_ERROR', `Studio design update failed: ${res.status}`);
      }
    } else {
      const res = await fetch(`${STUDIO_API_BASE}/projects/${encodeURIComponent(projectId)}/designs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sanitized),
        cache: 'no-store',
      });
      if (!res.ok) {
        return errorResponse('INTERNAL_ERROR', `Studio design creation failed: ${res.status}`);
      }
    }

    const updatedRoom = await fetchRoomByProjectId(projectId);
    const roomData = extractRoomLayout(updatedRoom);
    const persistedDesign = extractRoomDesign(updatedRoom);
    if (!roomData) {
      return errorResponse('INTERNAL_ERROR', `Room layout not found for project ${projectId}`);
    }

    return successResponse({
      room_data: roomData,
      design: persistedDesign,
    });
  } catch (err) {
    console.error('[project design upsert] Error:', err);
    return errorResponse('INTERNAL_ERROR', 'Failed to persist project design');
  }
}
