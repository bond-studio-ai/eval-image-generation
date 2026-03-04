/**
 * Server-side client for calling the image-generation service.
 * Used by SSR pages to fetch data. Reads BASE_API_HOSTNAME from env.
 */

const getBase = () => {
  const base = process.env.BASE_API_HOSTNAME;
  if (!base) throw new Error('BASE_API_HOSTNAME is not set');
  return `${base.replace(/\/$/, '')}/image-generation/v1`;
};

/** Recursively convert all snake_case keys to camelCase. */
function toCamelCase(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(toCamelCase);
  if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
      const camel = key.replace(/_([a-z0-9])/g, (_, c) => (c as string).toUpperCase());
      out[camel] = toCamelCase(val);
    }
    return out;
  }
  return obj;
}

async function fetchService<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${getBase()}${path.startsWith('/') ? path : `/${path}`}`;
  const res = await fetch(url, { cache: 'no-store', ...init });
  if (!res.ok) {
    throw new Error(`Service ${res.status}: ${url}`);
  }
  const json = await res.json();
  return toCamelCase(json.data) as T;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PromptVersionListItem {
  id: string;
  name: string | null;
  systemPrompt: string;
  userPrompt: string;
  description: string | null;
  generationCount: number;
  createdAt: string;
  deletedAt: string | null;
}

export interface PromptVersionMinimalItem {
  id: string;
  name: string | null;
}

export interface StrategyListItem {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  stepCount: number;
  runCount: number;
}

export interface StrategyStepItem {
  id: string;
  stepOrder: number;
  name: string | null;
  promptVersionId: string;
  promptVersionName: string | null;
  model: string;
  aspectRatio: string;
  outputResolution: string;
  temperature: string | null;
  useGoogleSearch: boolean;
  tagImages: boolean;
  dollhouseViewFromStep: number | null;
  realPhotoFromStep: number | null;
  moodBoardFromStep: number | null;
  includeDollhouse: boolean;
  includeRealPhoto: boolean;
  includeMoodBoard: boolean;
  includeProductImages: boolean;
  includeProductCategories: string[];
  arbitraryImageFromStep: number | null;
}

export interface StrategyDetailItem {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  deletedAt: string | null;
  model: string;
  aspectRatio: string;
  outputResolution: string;
  temperature: string | null;
  useGoogleSearch: boolean;
  tagImages: boolean;
  steps: StrategyStepItem[];
  runCount: number;
}

export interface InputPresetMinimalItem {
  id: string;
  name: string | null;
}

export interface InputPresetListItemForBuilder {
  id: string;
  name: string | null;
  description: string | null;
  dollhouseView: string | null;
  realPhoto: string | null;
  moodBoard: string | null;
  createdAt: string;
  imageCount: number;
  stats?: { generation_count: number };
}

// ─── Prompt Versions ─────────────────────────────────────────────────────────

export async function fetchPromptVersions(limit = 100): Promise<PromptVersionListItem[]> {
  return fetchService<PromptVersionListItem[]>(`/prompt-versions?limit=${limit}`);
}

export async function fetchPromptVersionsMinimal(limit = 100): Promise<PromptVersionMinimalItem[]> {
  return fetchService<PromptVersionMinimalItem[]>(`/prompt-versions?limit=${limit}&minimal=true`);
}

export async function fetchPromptVersionById(id: string) {
  return fetchService<Record<string, unknown>>(`/prompt-versions/${id}`);
}

// ─── Strategies ──────────────────────────────────────────────────────────────

export async function fetchStrategies(limit = 100): Promise<StrategyListItem[]> {
  return fetchService<StrategyListItem[]>(`/strategies?limit=${limit}`);
}

export async function fetchStrategyById(id: string): Promise<StrategyDetailItem | null> {
  try {
    return await fetchService<StrategyDetailItem>(`/strategies/${id}`);
  } catch {
    return null;
  }
}

export async function fetchStrategyRuns(strategyId: string, limit = 50) {
  return fetchService<Record<string, unknown>[]>(`/strategies/${strategyId}/runs?limit=${limit}`);
}

// ─── Strategy Runs ───────────────────────────────────────────────────────────

export async function fetchStrategyRunById(runId: string) {
  return fetchService<Record<string, unknown>>(`/strategy-runs/${runId}`);
}

// ─── Input Presets ───────────────────────────────────────────────────────────

export async function fetchInputPresets(limit = 100): Promise<InputPresetListItemForBuilder[]> {
  return fetchService<InputPresetListItemForBuilder[]>(`/input-presets?limit=${limit}`);
}

export async function fetchInputPresetsMinimal(limit = 100): Promise<InputPresetMinimalItem[]> {
  return fetchService<InputPresetMinimalItem[]>(`/input-presets?limit=${limit}&minimal=true`);
}

export async function fetchInputPresetById(id: string) {
  return fetchService<Record<string, unknown>>(`/input-presets/${id}`);
}

// ─── Generations ─────────────────────────────────────────────────────────────

export async function fetchGenerationById(id: string) {
  return fetchService<Record<string, unknown>>(`/generations/${id}`);
}

export async function fetchGenerations(params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  const url = `/generations${qs ? `?${qs}` : ''}`;
  const base = getBase();
  const res = await fetch(`${base}${url}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Service ${res.status}`);
  const json = await res.json();
  return toCamelCase(json) as { data: Record<string, unknown>[]; pagination: Record<string, unknown> };
}

// ─── Generation Outputs ──────────────────────────────────────────────────────

export async function fetchGenerationOutputs(params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  return fetchService<Record<string, unknown>[]>(`/generation-outputs${qs ? `?${qs}` : ''}`);
}

// ─── Analytics ───────────────────────────────────────────────────────────────

export async function fetchAnalyticsRatings(params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  return fetchService<{
    totalGenerations: number;
    ratedGenerations: number;
    distribution: { rating: string; count: number; percentage: number }[];
  }>(`/analytics/ratings${qs ? `?${qs}` : ''}`);
}

export async function fetchAnalyticsStrategyPerformance(params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  return fetchService<{ rows: Record<string, unknown>[]; models: string[] }>(
    `/analytics/strategy-performance${qs ? `?${qs}` : ''}`,
  );
}
