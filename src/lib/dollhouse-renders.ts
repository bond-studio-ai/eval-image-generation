import { serviceV2Url } from './api-base';

export type DollhouseRenderStatus = 'pending' | 'posted' | 'completed' | 'failed';

export interface DollhouseImageConfig {
  format: 'Png' | 'Jpeg' | 'Exr';
  height: number;
  width: number;
  superSamplingMultiplier?: number;
}

export type DollhouseRenderMode = 'LINEWORK' | 'COLORIZED_LINEWORK' | 'STANDARD_LIT';

export interface DollhouseRenderConfig {
  advancedSegmentation?: boolean;
  overrideCameraHeight?: number;
  renderMode?: DollhouseRenderMode;
}

export interface DollhouseSsmParams {
  addressablesCatalog?: string;
  host?: string;
  uploadBucket?: string;
}

export interface DollhouseStyleOverride {
  product: string;
  style: string;
}

export interface DollhousePoint3 {
  x: number;
  y: number;
  z: number;
}

export interface DollhouseCameraFrameProduct {
  category: string;
  id: string;
  view: string;
}

export interface DollhouseCameraFrame {
  aspect: number;
  fov: number;
  position: DollhousePoint3;
  priority: number;
  products: DollhouseCameraFrameProduct[];
  rotation: DollhousePoint3;
  summary: string;
}

export interface UnitySlimDesignMaterials {
  id: string;
  objects: Record<string, unknown>;
  surfaces: Record<string, unknown>;
}

export interface DollhouseRenderFrame {
  id: string;
  renderJobId: string;
  frameIndex: number;
  imageUrl: string;
  prettyUrl: string;
  depthUrl?: string;
  productMaskUrl?: string;
  productMaskMap?: unknown;
  summary: string;
  priority: number;
  clearColor?: unknown;
  hotspots?: unknown[];
  productsInFrame?: unknown[];
  input?: unknown;
  createdAt: string;
}

export interface DollhouseRender {
  id: string;
  projectId: string;
  callbackUrl: string | null;
  status: DollhouseRenderStatus;
  imageConfig: DollhouseImageConfig;
  renderConfig: DollhouseRenderConfig | null;
  frames?: DollhouseRenderFrame[];
  postedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface V2Pagination {
  currentPage: number;
  perPage: number;
  total: number;
  lastPage: number;
  to: number;
  from: number;
}

export interface V2ListResponse<T> {
  data: T[];
  pagination: V2Pagination;
}

export interface CreateDollhouseRenderBody {
  id?: string;
  cameraFrames: DollhouseCameraFrame[];
  designMaterials: UnitySlimDesignMaterials;
  imageConfig: DollhouseImageConfig;
  projectId: string;
  renderConfig?: DollhouseRenderConfig;
  roomData: Record<string, unknown>;
  ssmParams?: DollhouseSsmParams;
  styleOverrides?: DollhouseStyleOverride[];
}

interface RequestErrorJson {
  error?: { code?: string; message?: string; details?: unknown };
}

export class DollhouseRenderApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;
  constructor(status: number, message: string, code?: string, details?: unknown) {
    super(message);
    this.name = 'DollhouseRenderApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/** Server returned 2xx but the body wasn't the expected `{ data: [...] }` shape. */
export class DollhouseRenderUnexpectedResponseError extends Error {
  constructor(message = 'Server returned an unexpected response shape') {
    super(message);
    this.name = 'DollhouseRenderUnexpectedResponseError';
  }
}

/**
 * Stable, collision-free per-frame identifier for use as a React key or set
 * member. The upstream renderer doesn't give frames an `id` until after a
 * render job exists, so we derive one from `(priority, summary, index)`.
 *
 * The array index is always included — `(priority, summary)` alone is not
 * guaranteed unique within a project (two frames can share both), and a
 * non-unique key would let the include/exclude `Set` collapse multiple frames
 * into one toggle and submit the wrong subset.
 *
 * Index stability is acceptable here because the only writer of the
 * exclusion set resets it whenever a fresh `cameraFrames[]` is loaded.
 */
export function cameraFrameKey(frame: DollhouseCameraFrame, index: number): string {
  const summary = frame.summary.trim();
  return `${index}|p${frame.priority}|${summary}`;
}

async function parseError(res: Response): Promise<DollhouseRenderApiError> {
  let body: RequestErrorJson | null = null;
  try {
    body = (await res.json()) as RequestErrorJson;
  } catch {
    // fall through
  }
  const message = body?.error?.message ?? `Request failed (${res.status})`;
  return new DollhouseRenderApiError(res.status, message, body?.error?.code, body?.error?.details);
}

export interface ListDollhouseRendersParams {
  status?: DollhouseRenderStatus;
  projectId?: string;
  includeFrames?: boolean;
  currentPage?: number;
  perPage?: number;
}

export async function listDollhouseRenders(
  params: ListDollhouseRendersParams = {},
  init?: RequestInit,
): Promise<V2ListResponse<DollhouseRender>> {
  const qs = new URLSearchParams();
  if (params.status) qs.set('status', params.status);
  if (params.projectId) qs.set('projectId', params.projectId);
  if (params.includeFrames) qs.append('include[]', 'frames');
  if (params.currentPage) qs.set('currentPage', String(params.currentPage));
  if (params.perPage) qs.set('perPage', String(params.perPage));
  const suffix = qs.toString() ? `?${qs.toString()}` : '';

  const res = await fetch(`${serviceV2Url('dollhouse-renders')}${suffix}`, init);
  if (!res.ok) throw await parseError(res);
  return (await res.json()) as V2ListResponse<DollhouseRender>;
}

/**
 * Fetch a single render. Works in both client and server contexts:
 *
 * - From the browser, omit `baseUrl` (defaults to the v2 proxy, which gates on
 *   Clerk and applies the standard upstream-error logging).
 * - From a server component, pass `imageGenerationV2Base()` so the call doesn't
 *   need to round-trip through Next's request layer.
 */
export async function getDollhouseRender(
  id: string,
  options: { includeFrames?: boolean; baseUrl?: string } = {},
  init?: RequestInit,
): Promise<DollhouseRender | null> {
  const qs = new URLSearchParams();
  if (options.includeFrames) qs.append('include[]', 'frames');
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  const path = `dollhouse-renders/${encodeURIComponent(id)}`;
  const url = options.baseUrl
    ? `${options.baseUrl}/${path}${suffix}`
    : `${serviceV2Url(path)}${suffix}`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    ...(options.baseUrl ? { cache: 'no-store' as RequestCache } : {}),
    ...init,
  });
  if (res.status === 404) return null;
  if (!res.ok) throw await parseError(res);
  const json = (await res.json()) as V2ListResponse<DollhouseRender>;
  return json.data[0] ?? null;
}

export async function createDollhouseRender(
  body: CreateDollhouseRenderBody,
  init?: RequestInit,
): Promise<DollhouseRender> {
  const res = await fetch(serviceV2Url('dollhouse-renders'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    ...init,
  });
  if (!res.ok) throw await parseError(res);
  const json = (await res.json()) as V2ListResponse<DollhouseRender>;
  const created = json.data[0];
  if (!created) {
    throw new DollhouseRenderUnexpectedResponseError(
      'Create render succeeded but the server returned no render object.',
    );
  }
  return created;
}
