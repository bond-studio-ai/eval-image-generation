/**
 * Server-side client for calling the image-generation service.
 * Used by SSR pages to fetch data.
 */

import { imageGenerationBase, imageGenerationV2Base } from './env';
import type { InputPresetDesignFields } from './input-preset-design';

export {
  parseStrategyRunJudgeResults,
  type StrategyRunJudgeResultEntry,
} from './strategy-run-judge-results';

const getBase = () => imageGenerationBase();
const getV2Base = () => imageGenerationV2Base();

async function fetchService<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${getBase()}${path.startsWith('/') ? path : `/${path}`}`;
  const res = await fetch(url, { cache: 'no-store', ...init });
  if (!res.ok) {
    throw new Error(`Service ${res.status}: ${url}`);
  }
  const json = await res.json();
  return json.data as T;
}

async function fetchServiceV2<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${getV2Base()}${path.startsWith('/') ? path : `/${path}`}`;
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

export interface PromptPreviewDollhouseArea {
  summary: string;
  imageUrl: string;
  priority: number;
}

export interface PromptPreviewDollhouseSource {
  projectId: string;
  projectLabel: string;
  defaultAreaSummary: string | null;
  areas: PromptPreviewDollhouseArea[];
}

export type StrategyRunSource = 'dollhouse' | 'photo' | 'pdp';

export interface StrategyListItem {
  id: string;
  name: string;
  description: string | null;
  /** The source this strategy is active for, or null when inactive. */
  activeForSource: StrategyRunSource | null;
  /** Derived from `activeForSource`: true when active for any source. */
  isActive: boolean;
  createdAt: string;
  stepCount: number;
  runCount: number;
}

export interface StrategyStepItem {
  id: string;
  stepOrder: number;
  type: 'generation' | 'judge';
  numberOfImages: number | null;
  name: string | null;
  promptVersionId: string | null;
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
  productImageTypes: Record<string, string>;
  arbitraryImageFromStep: number | null;
  judges: StrategyJudgeItem[];
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

export interface StrategyDetailItem {
  id: string;
  name: string;
  description: string | null;
  /** The source this strategy is active for, or null when inactive. */
  activeForSource: StrategyRunSource | null;
  /** Derived from `activeForSource`: true when active for any source. */
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
  /** When true, every generation step inherits the prior step's chat history (Gemini multi-turn natively; OpenAI image / Fal flatten). */
  enableMultiTurnContext?: boolean;
  previewModel: string | null;
  previewResolution: string | null;
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

export type ProviderModelUseCase =
  | 'IMAGE_GENERATION'
  | 'PREVIEW_IMAGE_GENERATION'
  | 'IMAGE_GENERATION_FALLBACK'
  | 'JUDGING'
  | 'SEGMENTATION'
  | 'DEPTH_ANALYSIS';

export interface ProviderModelCapability {
  id: string;
  useCase: ProviderModelUseCase;
  productAvailable: boolean;
  isDefault: boolean;
  config: Record<string, unknown>;
  sortOrder: number;
}

export interface ProviderModelV2 {
  id: string;
  providerId: string;
  providerKey: 'gemini' | 'openai' | 'fal';
  providerDisplayName: string;
  providerModelId: string;
  displayName: string;
  shortName: string | null;
  description: string | null;
  status: string;
  metadata: Record<string, unknown>;
  useCases: ProviderModelCapability[];
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface StrategyModelCatalog {
  generation: ProviderModelV2[];
  preview: ProviderModelV2[];
  judge: ProviderModelV2[];
}

export async function fetchProviderModelsV2(
  params: {
    productAvailable?: boolean;
    providerId?: string;
    useCase?: ProviderModelUseCase;
  } = {},
): Promise<ProviderModelV2[]> {
  const query = new URLSearchParams();
  if (params.productAvailable !== undefined)
    query.set('productAvailable', String(params.productAvailable));
  if (params.providerId) query.set('providerId', params.providerId);
  if (params.useCase) query.set('useCase', params.useCase);
  query.set('perPage', '200');
  const suffix = query.toString();
  return fetchServiceV2<ProviderModelV2[]>(`/providers/models${suffix ? `?${suffix}` : ''}`);
}

export async function fetchStrategyModelCatalog(): Promise<StrategyModelCatalog> {
  const [generation, preview, judge] = await Promise.all([
    fetchProviderModelsV2({ productAvailable: true, useCase: 'IMAGE_GENERATION' }),
    fetchProviderModelsV2({ productAvailable: true, useCase: 'PREVIEW_IMAGE_GENERATION' }),
    fetchProviderModelsV2({ productAvailable: true, useCase: 'JUDGING' }),
  ]);
  return { generation, preview, judge };
}

// ─── Prompt Versions ─────────────────────────────────────────────────────────

export async function fetchPromptVersions(limit = 100): Promise<PromptVersionListItem[]> {
  return fetchService<PromptVersionListItem[]>(`/prompt-versions?limit=${limit}`);
}

export async function fetchPromptVersionsMinimal(limit = 100): Promise<PromptVersionMinimalItem[]> {
  return fetchService<PromptVersionMinimalItem[]>(`/prompt-versions?limit=${limit}&minimal=true`);
}

export async function fetchPromptPreviewDollhouseSource(): Promise<PromptPreviewDollhouseSource> {
  return fetchService<PromptPreviewDollhouseSource>('/prompt-versions/preview/dollhouse-source');
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

export interface AnalyticsStrategyStepRow {
  stepId: string;
  stepOrder: number;
  name: string | null;
  type: string;
  model: string | null;
  sampleCount: number;
  avgExecTimeMs: number | null;
  minExecTimeMs: number | null;
  maxExecTimeMs: number | null;
}

export async function fetchAnalyticsStrategyStepPerformance(params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  return fetchService<{ steps: AnalyticsStrategyStepRow[] }>(
    `/analytics/strategy-step-performance${qs ? `?${qs}` : ''}`,
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

// ─── Accuracy Trends ─────────────────────────────────────────────────────────

export interface AccuracyTrendPoint {
  date: string;
  sceneAccuracy: number;
  productAccuracy: number;
}

export async function fetchAnalyticsAccuracyTrends(params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  return fetchService<{ trends: AccuracyTrendPoint[] }>(
    `/analytics/accuracy-trends${qs ? `?${qs}` : ''}`,
  );
}

// ─── Environments ────────────────────────────────────────────────────────────

export interface EnvironmentListItem {
  id: string;
  name: string;
  apiHostname: string;
  isActive: boolean;
  hasAuthToken: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function fetchEnvironments(limit = 100): Promise<EnvironmentListItem[]> {
  return fetchService<EnvironmentListItem[]>(`/environments?limit=${limit}`);
}

export async function fetchEnvironmentById(id: string): Promise<EnvironmentListItem | null> {
  try {
    return await fetchService<EnvironmentListItem>(`/environments/${id}`);
  } catch {
    return null;
  }
}
