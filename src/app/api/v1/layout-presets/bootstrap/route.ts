import { errorResponse, successResponse } from '@/lib/api-response';

const PROJECTS_BASE = 'https://api.usedemo.io/v2/projects';
const SPATIAL_BASE = 'https://api.usedemo.io/spatial/v1';
const POLL_INTERVAL_MS = 750;
const POLL_TIMEOUT_MS = 12_000;
const STABLE_READS_REQUIRED = 2;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function getPresetId(rec: Record<string, unknown>): string {
  return typeof rec.id === 'string' ? rec.id.trim() : '';
}

function getLayoutTypeId(rec: Record<string, unknown>): string {
  return typeof rec.layoutTypeId === 'string' ? rec.layoutTypeId.trim() : '';
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchRawLayoutPresets(): Promise<Record<string, unknown>[]> {
  const res = await fetch(`${SPATIAL_BASE}/presets`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Spatial preset request failed: ${res.status}`);
  }
  const json = (await res.json()) as unknown;
  const rows = Array.isArray(json)
    ? json
    : Array.isArray(asRecord(json)?.data)
      ? ((asRecord(json)?.data as unknown[]) ?? [])
      : [];
  return rows.map((row) => asRecord(row)).filter((row): row is Record<string, unknown> => !!row);
}

async function resolveSpatialPresetId(layoutTypeIdOrPresetId: string): Promise<string> {
  const input = layoutTypeIdOrPresetId.trim();
  const rows = await fetchRawLayoutPresets();
  const match = rows.find((row) => {
    const presetId = getPresetId(row);
    const layoutTypeId = getLayoutTypeId(row);
    return presetId === input || layoutTypeId === input;
  });
  if (!match) throw new Error(`Spatial preset not found for ${layoutTypeIdOrPresetId}`);
  return getPresetId(match);
}

async function readProjectIdFromCreateResponse(res: Response): Promise<string> {
  const json = (await res.json()) as Record<string, unknown>;
  const candidates: unknown[] = [
    json,
    json.data,
    asRecord(json.data)?.project,
    asRecord(json.data)?.data,
  ];
  for (const candidate of candidates) {
    const rec = asRecord(candidate);
    if (rec && typeof rec.id === 'string' && rec.id) return rec.id;
  }
  throw new Error('Project ID not found in project creation response');
}

async function fetchRoomByProjectId(projectId: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${SPATIAL_BASE}/rooms?projectId=${encodeURIComponent(projectId)}`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Spatial room request failed: ${res.status}`);
  const json = (await res.json()) as { data?: Record<string, unknown>[] };
  const room = Array.isArray(json.data) ? json.data[0] : null;
  if (!room) throw new Error(`No rooms found for project ${projectId}`);
  return room;
}

async function waitForSettledRoomByProjectId(projectId: string): Promise<Record<string, unknown>> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  let lastRoom: Record<string, unknown> | null = null;
  let lastCount = -1;
  let stableReads = 0;

  while (Date.now() <= deadline) {
    const room = await fetchRoomByProjectId(projectId);
    const frameCount = Array.isArray(room.cameraFrames) ? room.cameraFrames.length : 0;
    lastRoom = room;
    if (frameCount > 0) {
      stableReads = frameCount === lastCount ? stableReads + 1 : 1;
      lastCount = frameCount;
      if (stableReads >= STABLE_READS_REQUIRED) return room;
    }
    if (Date.now() + POLL_INTERVAL_MS > deadline) break;
    await sleep(POLL_INTERVAL_MS);
  }

  if (lastRoom) return lastRoom;
  return fetchRoomByProjectId(projectId);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { layout_type_id?: unknown };
    const layoutTypeId =
      typeof body.layout_type_id === 'string' && body.layout_type_id.trim()
        ? body.layout_type_id.trim()
        : null;
    if (!layoutTypeId) {
      return errorResponse('VALIDATION_ERROR', 'layout_type_id is required');
    }

    const presetId = await resolveSpatialPresetId(layoutTypeId);
    const createProjectRes = await fetch(PROJECTS_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
      cache: 'no-store',
    });
    if (!createProjectRes.ok) {
      return errorResponse('INTERNAL_ERROR', `Project creation failed: ${createProjectRes.status}`);
    }
    const projectId = await readProjectIdFromCreateResponse(createProjectRes);

    const createRoomRes = await fetch(`${SPATIAL_BASE}/presets/${encodeURIComponent(presetId)}/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId }),
      cache: 'no-store',
    });
    if (!createRoomRes.ok) {
      return errorResponse('INTERNAL_ERROR', `Preset room creation failed: ${createRoomRes.status}`);
    }

    const room = await waitForSettledRoomByProjectId(projectId);
    const roomData = asRecord(room.layout);
    if (!roomData) {
      return errorResponse('INTERNAL_ERROR', `Room layout not found for project ${projectId}`);
    }

    return successResponse({
      project_id: projectId,
      room_data: roomData,
    });
  } catch (err) {
    console.error('[layout bootstrap] Error:', err);
    return errorResponse('INTERNAL_ERROR', 'Failed to bootstrap layout preset');
  }
}
