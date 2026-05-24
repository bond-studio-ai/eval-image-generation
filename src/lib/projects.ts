import { localUrl } from './api-base';
import {
  normalizeCameraFrame,
  type DollhouseCameraFrame,
  type UnitySlimDesignMaterials,
  type V2Pagination,
} from './dollhouse-renders';

export interface ProjectSummary {
  id: string;
  name: string;
  appStatus: string;
  crmStatus?: string;
  address?: string;
  created?: string;
  updated?: string;
}

export interface ProjectsListResponse {
  data: ProjectSummary[];
  /** v1-shape pagination (the BFF normalizes from upstream's v2 shape). */
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ProjectsListParams {
  status?: string;
  contractorId?: string;
  before?: string;
  after?: string;
  page?: number;
  limit?: number;
}

interface UpstreamProjectsListBody {
  data?: unknown[];
  pagination?: Partial<V2Pagination> & {
    page?: number;
    limit?: number;
    totalPages?: number;
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function normalizeProjectSummary(raw: unknown): ProjectSummary | null {
  const rec = isRecord(raw) ? raw : null;
  if (!rec || typeof rec.id !== 'string') return null;
  return {
    id: rec.id,
    name: typeof rec.name === 'string' ? rec.name : '',
    appStatus: typeof rec.appStatus === 'string' ? rec.appStatus : '',
    crmStatus: typeof rec.crmStatus === 'string' ? rec.crmStatus : undefined,
    address: typeof rec.address === 'string' ? rec.address : undefined,
    created: typeof rec.created === 'string' ? rec.created : undefined,
    updated: typeof rec.updated === 'string' ? rec.updated : undefined,
  };
}

export async function listProjects(
  params: ProjectsListParams = {},
  init?: RequestInit,
): Promise<ProjectsListResponse> {
  const qs = new URLSearchParams();
  if (params.status) qs.set('status', params.status);
  if (params.contractorId) qs.set('contractorId', params.contractorId);
  if (params.before) qs.set('before', params.before);
  if (params.after) qs.set('after', params.after);
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  const suffix = qs.toString() ? `?${qs.toString()}` : '';

  const res = await fetch(`${localUrl('projects')}${suffix}`, init);
  if (!res.ok) throw new Error(`Failed to list projects (${res.status})`);
  const json = (await res.json()) as UpstreamProjectsListBody;

  const items = Array.isArray(json.data)
    ? json.data.map(normalizeProjectSummary).filter((p): p is ProjectSummary => p !== null)
    : [];
  const pag = json.pagination ?? {};
  return {
    data: items,
    pagination: {
      page: pag.page ?? pag.currentPage ?? 1,
      limit: pag.limit ?? pag.perPage ?? items.length,
      total: pag.total ?? items.length,
      totalPages: pag.totalPages ?? pag.lastPage ?? 1,
    },
  };
}

export interface ProjectRenderBootstrap {
  project: ProjectSummary;
  /** `null` if the project has no Unity-slim design materials. */
  designMaterials: UnitySlimDesignMaterials | null;
  /** `null` if the project has no scan / room layout. */
  roomData: Record<string, unknown> | null;
  cameraFrames: DollhouseCameraFrame[];
}

function pickFirstDesign(value: unknown): unknown {
  if (Array.isArray(value) && value.length > 0) return value[0];
  return null;
}

function asUnitySlimDesign(value: unknown): UnitySlimDesignMaterials | null {
  if (!isRecord(value)) return null;
  if (typeof value.id !== 'string' || value.id.length === 0) return null;
  if (!isRecord(value.objects) || !isRecord(value.surfaces)) return null;
  return {
    id: value.id,
    objects: value.objects as Record<string, unknown>,
    surfaces: value.surfaces as Record<string, unknown>,
  };
}

function parseCameraFrames(raw: unknown): DollhouseCameraFrame[] {
  let array: unknown = raw;
  // `cameraFrames` may arrive as a JSON-encoded string (it's stored as text in
  // the projects DB and projects-service surfaces it through unchanged).
  if (typeof array === 'string') {
    try {
      array = JSON.parse(array) as unknown;
    } catch {
      return [];
    }
  }
  if (!Array.isArray(array)) return [];
  // Normalize each frame into the exact shape the v2 dollhouse-renders
  // endpoint expects (numeric position/rotation with defaults, sanitized
  // products). Passing the raw upstream object through unchanged was
  // tempting but trips the strict v2 validator on real-world data; see
  // `normalizeCameraFrame` for the per-field rules.
  return array.map(normalizeCameraFrame).filter((f): f is DollhouseCameraFrame => f !== null);
}

export async function fetchProjectWithRenderBootstrap(
  projectId: string,
  init?: RequestInit,
): Promise<ProjectRenderBootstrap> {
  const trimmed = projectId.trim();
  if (!trimmed) throw new Error('projectId is required');

  const qs = new URLSearchParams();
  qs.append('format[]', 'design:unity-slim');
  qs.append('include[]', 'camera_frames');
  const url = `${localUrl(`projects/${encodeURIComponent(trimmed)}`)}?${qs.toString()}`;

  const res = await fetch(url, init);
  if (!res.ok) {
    throw new Error(`Failed to fetch project ${trimmed} (${res.status})`);
  }
  // BFF is pass-through; upstream wraps the project in `{ data: [project] }`.
  const wrapper = (await res.json()) as { data?: unknown };
  const projectArray = wrapper.data;
  const project = Array.isArray(projectArray) ? projectArray[0] : null;
  if (!project || !isRecord(project)) {
    throw new Error(`Project ${trimmed} not found`);
  }

  const summary = normalizeProjectSummary(project);
  if (!summary) {
    throw new Error(`Project ${trimmed} response missing required fields`);
  }

  return {
    project: summary,
    designMaterials: asUnitySlimDesign(pickFirstDesign(project.designs)),
    // Pass the raw project scan through. The renderer needs fields that are
    // outside the old v2 strict whitelist (e.g. tub/shower-specific metadata).
    // service-image-generation#137 updates the v2 create endpoint to preserve
    // raw `roomData`, matching the proven strategy dollhouse-capture path.
    roomData: isRecord(project.scan) ? (project.scan as Record<string, unknown>) : null,
    cameraFrames: parseCameraFrames(project.cameraFrames),
  };
}
