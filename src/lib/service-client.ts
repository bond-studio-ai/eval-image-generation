/**
 * Server-side client for calling the image-generation service.
 * Used by SSR pages to fetch data. Reads BASE_API_HOSTNAME from env.
 */

const getBase = () => {
  const base = process.env.BASE_API_HOSTNAME;
  if (!base) throw new Error('BASE_API_HOSTNAME is not set');
  return `${base.replace(/\/$/, '')}/image-generation/v1`;
};

async function fetchService<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${getBase()}${path.startsWith('/') ? path : `/${path}`}`;
  const res = await fetch(url, { cache: 'no-store', ...init });
  if (!res.ok) {
    throw new Error(`Service ${res.status}: ${url}`);
  }
  const json = await res.json();
  return json.data as T;
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
  isActive: boolean;
  createdAt: string;
  stepCount: number;
  runCount: number;
}

import type { InputPresetDesignFields } from './input-preset-design';

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

export interface StrategyJudgeItem {
  id: string;
  strategyId: string;
  name: string | null;
  judgeModel: string;
  judgeType: 'batch' | 'individual';
  judgePromptVersionId: string;
  judgePromptVersionName: string | null;
  toleranceThreshold: number;
  position: number;
  createdAt: string;
  updatedAt: string;
}

/** Per-judge evaluation row for a strategy run (from strategy_run_judge_result + judge config). */
export interface StrategyRunJudgeResultEntry {
  id: string;
  strategyRunId: string;
  strategyJudgeId: string;
  judgeModel: string;
  judgeName: string | null;
  judgePromptVersionId: string;
  judgePromptVersionName: string | null;
  position: number;
  judgeType: 'batch' | 'individual';
  judgeScore: number | null;
  judgeReasoning: string | null;
  judgeOutput: string | null;
  judgeSystemPrompt: string | null;
  judgeUserPrompt: string | null;
  judgeInputImages: { url: string; label: string; isComposite?: boolean; sourceImages?: { url: string; label: string }[] }[] | null;
  judgeTypeUsed: string | null;
}

export interface StrategyDetailItem {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  deletedAt: string | null;
  model: string;
  aspectRatio: string;
  outputResolution: string;
  temperature: string | null;
  useGoogleSearch: boolean;
  tagImages: boolean;
  groupProductImages: boolean;
  /** When true, service runs scene-accuracy vs scene reference before judging; may regenerate candidates if none pass. */
  checkSceneAccuracy?: boolean;
  previewModel: string | null;
  previewResolution: string | null;
  steps: StrategyStepItem[];
  judges?: StrategyJudgeItem[];
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
  layoutTypeId?: string | null;
  pkgId?: string | null;
  pkg_id?: string | null;
  dollhouseView: string | null;
  realPhoto: string | null;
  moodBoard: string | null;
  createdAt: string;
  imageCount: number;
  stats?: { generationCount: number };
}

export interface InputPresetDetailItem extends InputPresetDesignFields {
  id: string;
  name: string | null;
  description: string | null;
  layoutTypeId?: string | null;
  layout_type_id?: string | null;
  pkgId?: string | null;
  pkg_id?: string | null;
  dollhouseView: string | null;
  dollhouse_view?: string | null;
  realPhoto: string | null;
  real_photo?: string | null;
  moodBoard: string | null;
  mood_board?: string | null;
  deletedAt: string | null;
  createdAt: string;
}

// ─── Models ──────────────────────────────────────────────────────────────────

export interface ModelInfo {
  id: string;
  name: string;
  provider: 'gemini' | 'openai' | 'fal';
}

export interface ModelListing {
  generation: ModelInfo[];
  judge: ModelInfo[];
}

export async function fetchModels(): Promise<ModelListing> {
  return fetchService<ModelListing>('/models');
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

export async function fetchActiveStrategy(): Promise<StrategyDetailItem | null> {
  try {
    return await fetchService<StrategyDetailItem>('/strategies/active');
  } catch {
    return null;
  }
}

export async function fetchStrategyRuns(strategyId: string, limit = 50) {
  return fetchService<Record<string, unknown>[]>(`/strategies/${strategyId}/runs?limit=${limit}`);
}

/** Normalize `judgeResults` from a strategy run API payload. */
export function parseStrategyRunJudgeResults(value: unknown): StrategyRunJudgeResultEntry[] {
  if (!Array.isArray(value)) return [];
  const out: StrategyRunJudgeResultEntry[] = [];
  for (const row of value) {
    if (row == null || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    const id = r.id != null ? String(r.id) : '';
    if (!id) continue;
    const imgs = r.judgeInputImages;
    out.push({
      id,
      strategyRunId: r.strategyRunId != null ? String(r.strategyRunId) : '',
      strategyJudgeId: r.strategyJudgeId != null ? String(r.strategyJudgeId) : '',
      judgeModel: r.judgeModel != null ? String(r.judgeModel) : '',
      judgeName: r.judgeName != null ? String(r.judgeName) : null,
      judgePromptVersionId: r.judgePromptVersionId != null ? String(r.judgePromptVersionId) : '',
      judgePromptVersionName: r.judgePromptVersionName != null ? String(r.judgePromptVersionName) : null,
      position: typeof r.position === 'number' ? r.position : Number(r.position) || 0,
      judgeType: r.judgeType === 'individual' ? 'individual' : 'batch',
      judgeScore: typeof r.judgeScore === 'number' ? r.judgeScore : r.judgeScore != null ? Number(r.judgeScore) : null,
      judgeReasoning: r.judgeReasoning != null ? String(r.judgeReasoning) : null,
      judgeOutput: r.judgeOutput != null ? String(r.judgeOutput) : null,
      judgeSystemPrompt: r.judgeSystemPrompt != null ? String(r.judgeSystemPrompt) : null,
      judgeUserPrompt: r.judgeUserPrompt != null ? String(r.judgeUserPrompt) : null,
      judgeInputImages: Array.isArray(imgs) ? (imgs as StrategyRunJudgeResultEntry['judgeInputImages']) : null,
      judgeTypeUsed: r.judgeTypeUsed != null ? String(r.judgeTypeUsed) : null,
    });
  }
  return out;
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

export async function fetchInputPresetById(id: string): Promise<InputPresetDetailItem> {
  return fetchService<InputPresetDetailItem>(`/input-presets/${id}`);
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
  return json as { data: Record<string, unknown>[]; pagination: Record<string, unknown> };
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

export interface ReliabilityData {
  summary: {
    totalRuns: number;
    completedRuns: number;
    failedRuns: number;
    skippedRuns: number;
    failureRate: number;
  };
  generationErrors: {
    totalSteps: number;
    failedSteps: number;
    timedOutSteps: number;
    failureRate: number;
    timeoutRate: number;
    errorBreakdown: { reason: string; count: number }[];
  };
  judgeErrors: {
    totalJudged: number;
    failedJudges: number;
    judgeFailureRate: number;
    errorBreakdown: { reason: string; count: number }[];
  };
  trends: {
    period: string;
    totalRuns: number;
    failedRuns: number;
    timedOutSteps: number;
    judgeFailures: number;
  }[];
}

export async function fetchAnalyticsReliability(params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  return fetchService<ReliabilityData>(`/analytics/reliability${qs ? `?${qs}` : ''}`);
}
