import { serviceV2Url } from "./api-base";
import { HTTP_NOT_FOUND } from "./http-status";

export type DollhouseRenderStatus = "pending" | "posted" | "completed" | "failed";

export interface DollhouseImageConfig {
  format: "Png" | "Jpeg" | "Exr";
  height: number;
  width: number;
  superSamplingMultiplier?: number;
}

export type DollhouseRenderMode = "LINEWORK" | "COLORIZED_LINEWORK" | "STANDARD_LIT";

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

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: string };

/**
 * Single source of truth for "is this a Unity-slim design materials object?".
 * Used both by the silent project-bootstrap path (which discards the error
 * message) and by the manual JSON paste UI (which surfaces the field that
 * failed). Keep new validation in one place — having two copies caused drift
 * the last time the v2 schema tightened.
 */
interface RawUnitySlimDesign {
  id?: unknown;
  objects?: unknown;
  surfaces?: unknown;
}

export function validateUnitySlimDesign(value: unknown): ValidationResult<UnitySlimDesignMaterials> {
  if (!isRecord(value)) return { ok: false, error: "Expected a JSON object." };
  const raw = value as RawUnitySlimDesign;
  if (typeof raw.id !== "string" || raw.id.length === 0) {
    return { ok: false, error: "designMaterials.id is required." };
  }
  if (!isRecord(raw.objects)) {
    return { ok: false, error: "designMaterials.objects must be an object." };
  }
  if (!isRecord(raw.surfaces)) {
    return { ok: false, error: "designMaterials.surfaces must be an object." };
  }
  return {
    ok: true,
    value: {
      id: raw.id,
      objects: raw.objects,
      surfaces: raw.surfaces
    }
  };
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
  code?: string | undefined;
  details?: unknown;
  constructor(status: number, message: string, code?: string, details?: unknown) {
    super(message);
    this.name = "DollhouseRenderApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/**
 * Pull out the per-field issues that the upstream `validateRequest` helper
 * surfaces via `details.issues` (a `Record<string, string[]>` from
 * `z.flattenError`). Returns a one-line summary so the form can show *what*
 * failed, not just "Invalid request body".
 */
function summarizeZodIssues(details: unknown): string | null {
  if (!isRecord(details)) return null;
  const raw = details as { issues?: unknown };
  const issues = isRecord(raw.issues) ? raw.issues : null;
  if (!issues) return null;
  const lines: string[] = [];
  for (const [field, messages] of Object.entries(issues)) {
    const list = Array.isArray(messages) ? messages.map(String) : [String(messages)];
    if (list.length === 0) continue;
    lines.push(`${field}: ${list.join("; ")}`);
  }
  return lines.length > 0 ? lines.join(" | ") : null;
}

/** Server returned 2xx but the body wasn't the expected `{ data: [...] }` shape. */
class DollhouseRenderUnexpectedResponseError extends Error {
  constructor(message = "Server returned an unexpected response shape") {
    super(message);
    this.name = "DollhouseRenderUnexpectedResponseError";
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

// ─── cameraFrames normalization ──────────────────────────────────────────────

function numberOr(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function trimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

interface RawPoint3 {
  x?: unknown;
  y?: unknown;
  z?: unknown;
}

function asPoint3(value: unknown): DollhousePoint3 | null {
  if (!isRecord(value)) return null;
  const raw = value as RawPoint3;
  return {
    x: numberOr(raw.x, 0),
    y: numberOr(raw.y, 0),
    z: numberOr(raw.z, 0)
  };
}

interface RawCameraFrameProduct {
  id?: unknown;
  category?: unknown;
  view?: unknown;
}

function normalizeCameraFrameProduct(value: unknown): DollhouseCameraFrameProduct | null {
  // Spatial occasionally serializes `products` entries as bare id strings;
  // those can't satisfy the upstream `category.min(1)` / `view.min(1)` rules,
  // so we drop them. Object entries with empty fields are also dropped.
  if (!isRecord(value)) return null;
  const raw = value as RawCameraFrameProduct;
  const id = trimmedString(raw.id);
  const category = trimmedString(raw.category);
  const view = trimmedString(raw.view);
  if (!id || !category || !view) return null;
  return { id, category, view };
}

/**
 * Normalize a single camera frame to the shape the v2 dollhouse-renders
 * endpoint expects. Returns `null` only when the frame is unrecoverable
 * (missing `position`/`rotation`). Coerces numeric defaults rather than
 * silently dropping frames over individual missing fields, mirroring the
 * normalization the image-generation service applies internally.
 */
interface RawCameraFrame {
  position?: unknown;
  rotation?: unknown;
  products?: unknown;
  aspect?: unknown;
  fov?: unknown;
  priority?: unknown;
  summary?: unknown;
}

export function normalizeCameraFrame(value: unknown): DollhouseCameraFrame | null {
  if (!isRecord(value)) return null;
  const raw = value as RawCameraFrame;
  const position = asPoint3(raw.position);
  const rotation = asPoint3(raw.rotation);
  if (!position || !rotation) return null;

  const products = Array.isArray(raw.products) ? raw.products.map(normalizeCameraFrameProduct).filter((product): product is DollhouseCameraFrameProduct => product !== null) : [];

  return {
    aspect: numberOr(raw.aspect, 0),
    fov: numberOr(raw.fov, 0),
    position,
    rotation,
    priority: numberOr(raw.priority, 0),
    summary: typeof raw.summary === "string" ? raw.summary : "",
    products
  };
}

async function parseError(res: Response): Promise<DollhouseRenderApiError> {
  let body: RequestErrorJson | null = null;
  try {
    body = (await res.json()) as RequestErrorJson;
  } catch {
    // fall through
  }
  const baseMessage = body?.error?.message ?? `Request failed (${res.status})`;
  const issueSummary = summarizeZodIssues(body?.error?.details);
  const message = issueSummary ? `${baseMessage} — ${issueSummary}` : baseMessage;
  return new DollhouseRenderApiError(res.status, message, body?.error?.code, body?.error?.details);
}

/**
 * Fetch a single render. Works in both client and server contexts:
 *
 * - From the browser, omit `baseUrl` (defaults to the v2 proxy, which gates on
 *   Clerk and applies the standard upstream-error logging).
 * - From a server component, pass `imageGenerationV2Base()` so the call doesn't
 *   need to round-trip through Next's request layer.
 */
export async function getDollhouseRender(id: string, options: { includeFrames?: boolean; baseUrl?: string } = {}, init?: RequestInit): Promise<DollhouseRender | null> {
  const qs = new URLSearchParams();
  if (options.includeFrames) qs.append("include[]", "frames");
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const path = `dollhouse-renders/${encodeURIComponent(id)}`;
  const url = options.baseUrl ? `${options.baseUrl}/${path}${suffix}` : `${serviceV2Url(path)}${suffix}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    ...(options.baseUrl ? { cache: "no-store" as RequestCache } : {}),
    ...init
  });
  if (res.status === HTTP_NOT_FOUND) return null;
  if (!res.ok) throw await parseError(res);
  const json = (await res.json()) as V2ListResponse<DollhouseRender>;
  return json.data[0] ?? null;
}

export async function createDollhouseRender(body: CreateDollhouseRenderBody, init?: RequestInit): Promise<DollhouseRender> {
  const res = await fetch(serviceV2Url("dollhouse-renders"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    ...init
  });
  if (!res.ok) throw await parseError(res);
  const json = (await res.json()) as V2ListResponse<DollhouseRender>;
  const [created] = json.data;
  if (!created) {
    throw new DollhouseRenderUnexpectedResponseError("Create render succeeded but the server returned no render object.");
  }
  return created;
}
