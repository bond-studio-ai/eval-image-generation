import { localUrl } from "./api-base";
import { type DollhouseCameraFrame, normalizeCameraFrame, type UnitySlimDesignMaterials, validateUnitySlimDesign } from "./dollhouse-renders";

export interface ProjectSummary {
  id: string;
  name: string;
  appStatus: string;
  crmStatus?: string | undefined;
  address?: string | undefined;
  created?: string | undefined;
  updated?: string | undefined;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

interface RawProjectSummary {
  id?: unknown;
  name?: unknown;
  appStatus?: unknown;
  crmStatus?: unknown;
  address?: unknown;
  created?: unknown;
  updated?: unknown;
}

function normalizeProjectSummary(raw: unknown): ProjectSummary | null {
  const rec = isRecord(raw) ? (raw as RawProjectSummary) : null;
  if (!rec || typeof rec.id !== "string") return null;
  return {
    id: rec.id,
    name: typeof rec.name === "string" ? rec.name : "",
    appStatus: typeof rec.appStatus === "string" ? rec.appStatus : "",
    crmStatus: typeof rec.crmStatus === "string" ? rec.crmStatus : undefined,
    address: typeof rec.address === "string" ? rec.address : undefined,
    created: typeof rec.created === "string" ? rec.created : undefined,
    updated: typeof rec.updated === "string" ? rec.updated : undefined
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

interface RawProjectRecord {
  designs?: unknown;
  scan?: unknown;
  cameraFrames?: unknown;
}

function pickFirstDesign(value: unknown): unknown {
  if (Array.isArray(value) && value.length > 0) return value[0];
  return null;
}

function asUnitySlimDesign(value: unknown): UnitySlimDesignMaterials | null {
  const result = validateUnitySlimDesign(value);
  return result.ok ? result.value : null;
}

function parseCameraFrames(raw: unknown): DollhouseCameraFrame[] {
  let array: unknown = raw;
  // `cameraFrames` may arrive as a JSON-encoded string (it's stored as text in
  // the projects DB and projects-service surfaces it through unchanged).
  if (typeof array === "string") {
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
  return array.map(normalizeCameraFrame).filter((frame): frame is DollhouseCameraFrame => frame !== null);
}

export async function fetchProjectWithRenderBootstrap(projectId: string, init?: RequestInit): Promise<ProjectRenderBootstrap> {
  const trimmed = projectId.trim();
  if (!trimmed) throw new Error("projectId is required");

  const qs = new URLSearchParams();
  qs.append("format[]", "design:unity-slim");
  qs.append("include[]", "camera_frames");
  const url = `${localUrl(`projects/${encodeURIComponent(trimmed)}`)}?${qs.toString()}`;

  const res = await fetch(url, init);
  if (!res.ok) {
    throw new Error(`Failed to fetch project ${trimmed} (${res.status})`);
  }
  // BFF is pass-through; upstream wraps the project in `{ data: [project] }`.
  const wrapper = (await res.json()) as { data?: unknown };
  const projectArray = wrapper.data;
  const project: unknown = Array.isArray(projectArray) ? projectArray[0] : null;
  if (!project || !isRecord(project)) {
    throw new Error(`Project ${trimmed} not found`);
  }

  const summary = normalizeProjectSummary(project);
  if (!summary) {
    throw new Error(`Project ${trimmed} response missing required fields`);
  }

  const projectRecord = project as RawProjectRecord;
  return {
    project: summary,
    designMaterials: asUnitySlimDesign(pickFirstDesign(projectRecord.designs)),
    // Pass the raw project scan through. The renderer needs fields that are
    // outside the old v2 strict whitelist (e.g. tub/shower-specific metadata).
    // service-image-generation#137 updates the v2 create endpoint to preserve
    // raw `roomData`, matching the proven strategy dollhouse-capture path.
    roomData: isRecord(projectRecord.scan) ? projectRecord.scan : null,
    cameraFrames: parseCameraFrames(projectRecord.cameraFrames)
  };
}
