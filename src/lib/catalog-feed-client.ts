/**
 * Server-side client for the service-catalog-feed calibrated-confidence
 * admin API. Used by Server Components that render the Catalog
 * Confidence section. Browser-side mutations (review submit, prompt
 * approve, threshold set, etc.) go through the /api/v1/catalog-feed
 * proxy instead, so the shared admin token never reaches the browser.
 *
 * Response envelope matches huma: the service returns the data object
 * directly (not wrapped in {data}). We intentionally do NOT unwrap a
 * {data: ...} envelope here — the only shape adjustment we make is
 * passing through the response body as-is.
 */

import { catalogFeedAdminToken, catalogFeedBase } from './env';

async function fetchAdmin<T>(path: string, init?: RequestInit): Promise<T> {
  const base = catalogFeedBase();
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;
  const headers = new Headers(init?.headers);
  if (!headers.has('accept')) headers.set('accept', 'application/json');
  const token = catalogFeedAdminToken();
  if (token && !headers.has('authorization')) {
    headers.set('authorization', `Bearer ${token}`);
  }
  const res = await fetch(url, { cache: 'no-store', ...init, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`catalog-feed ${res.status}: ${url}${text ? ` — ${text}` : ''}`);
  }
  return (await res.json()) as T;
}

// The catalog-feed admin API returns camelCase keys on its JSON-tagged
// list endpoints (e.g. /admin/runs) but the JSON-tag-less domain types
// (PromptVersion, CalibrationModel, RoutingThreshold, AdminRunDetail)
// fall through to Go's default PascalCase marshalling. Rather than
// forcing every caller to know which shape they get, we normalize
// incoming rows here with a small helper that accepts either case.
//
// This is explicitly a UI-side accommodation. The upstream types should
// grow JSON tags over time, and once they do the helper becomes a
// no-op; it is safe to keep in place either way.
type Raw = Record<string, unknown>;

function pick<T>(row: Raw, keys: string[], fallback: T): T {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null) return row[k] as T;
  }
  return fallback;
}

function pickOpt<T>(row: Raw, keys: string[]): T | null {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null) return row[k] as T;
  }
  return null;
}

// Categorical fields coming back from the upstream service are validated
// against an explicit allow-list before they are surfaced as the typed
// alias. Without these guards a future server change (a new decision
// lane, a typo, or a mis-cased value) would render with missing badge
// styles or undefined labels because the consumer code looks the value
// up in a Record<RoutingDecision, ...>. Falling back to a safe default
// keeps the UI legible and lets a reviewer still file a verdict; the
// upstream value is still available to debug from the network tab if
// needed.
const ROUTING_DECISIONS: ReadonlyArray<RoutingDecision> = [
  'auto_ship',
  'spot_check',
  'hold_for_review',
];
const HUMAN_VERDICTS: ReadonlyArray<HumanVerdict> = ['accept', 'reject', 'partial'];
const PROMPT_KINDS: ReadonlyArray<PromptKind> = ['generation', 'judge', 'extraction', 'meta'];
const PROMPT_STATUSES: ReadonlyArray<PromptStatus> = ['proposed', 'active', 'retired'];
const CALIBRATION_STATUSES: ReadonlyArray<CalibrationStatus> = ['active', 'retired'];

function asDecision(value: unknown): RoutingDecision {
  return typeof value === 'string' && (ROUTING_DECISIONS as readonly string[]).includes(value)
    ? (value as RoutingDecision)
    : 'spot_check';
}
function asVerdict(value: unknown): HumanVerdict {
  return typeof value === 'string' && (HUMAN_VERDICTS as readonly string[]).includes(value)
    ? (value as HumanVerdict)
    : 'accept';
}
function asPromptKind(value: unknown): PromptKind {
  return typeof value === 'string' && (PROMPT_KINDS as readonly string[]).includes(value)
    ? (value as PromptKind)
    : 'generation';
}
function asPromptStatus(value: unknown): PromptStatus {
  return typeof value === 'string' && (PROMPT_STATUSES as readonly string[]).includes(value)
    ? (value as PromptStatus)
    : 'proposed';
}
function asCalibrationStatus(value: unknown): CalibrationStatus {
  return typeof value === 'string' && (CALIBRATION_STATUSES as readonly string[]).includes(value)
    ? (value as CalibrationStatus)
    : 'active';
}

// ─── Types (match domain/aiaudit on the Go side) ────────────────────────────

export type RoutingDecision = 'auto_ship' | 'spot_check' | 'hold_for_review';
export type HumanVerdict = 'accept' | 'reject' | 'partial';
export type PromptKind = 'generation' | 'judge' | 'extraction' | 'meta';
export type PromptStatus = 'proposed' | 'active' | 'retired';
export type CalibrationStatus = 'active' | 'retired';

export interface AdminRunSummary {
  id: string;
  jobId: string | null;
  scope: string;
  kind: string;
  modelVendor: string;
  modelName: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  latencyMs: number;
  confidence: {
    raw: number;
    calibrated: number;
    decision: RoutingDecision;
  } | null;
  reviewed: boolean;
}

export interface JudgeEvaluationEntry {
  id: string;
  role: string;
  rawVerdict: string | null;
  scores: Record<string, number> | null;
  notes: string | null;
  createdAt: string;
  modelVendor: string;
  modelName: string;
}

export interface DeterministicCheckEntry {
  id: string;
  kind: string;
  passed: boolean;
  score: number | null;
  details: Record<string, unknown> | null;
  createdAt: string;
}

export interface HumanReviewEntry {
  id: string;
  verdict: HumanVerdict;
  perCriterionFlags: Record<string, unknown> | null;
  reviewerId: string;
  notes: string | null;
  createdAt: string;
}

export interface ConfidenceAssessmentEntry {
  id: string;
  rawScore: number;
  calibratedScore: number;
  decision: RoutingDecision;
  features: Record<string, unknown> | null;
  calibrationModelId: string | null;
  createdAt: string;
}

export interface AdminRunDetail {
  run: AdminRunSummary & {
    promptTemplate: string | null;
    promptKind: PromptKind | null;
    promptVersionId: string | null;
    requestPayload: Record<string, unknown> | null;
    responsePayload: Record<string, unknown> | null;
    errorMessage: string | null;
  };
  judgeEvaluations: JudgeEvaluationEntry[];
  deterministicChecks: DeterministicCheckEntry[];
  humanReviews: HumanReviewEntry[];
  confidence: ConfidenceAssessmentEntry[];
  artifactKeys: string[];
}

export interface PromptVersion {
  id: string;
  kind: PromptKind;
  scope: string;
  template: string;
  status: PromptStatus;
  parentId: string | null;
  rationale: string | null;
  createdBy: string;
  createdAt: string;
  activatedAt: string | null;
  retiredAt: string | null;
}

export interface CalibrationModel {
  id: string;
  scope: string;
  kind: string;
  trainingSetSize: number;
  brier: number | null;
  mae: number | null;
  params: Record<string, unknown>;
  status: CalibrationStatus;
  validFrom: string;
  validTo: string | null;
  createdAt: string;
}

export interface RoutingThreshold {
  id: string | null;
  scope: string;
  autoShipMin: number;
  holdMax: number;
  spotCheckSampleRate: number;
  updatedAt: string | null;
}

// ─── Runs ───────────────────────────────────────────────────────────────────

export interface ListRunsParams {
  scope?: string;
  decision?: RoutingDecision | '';
  minScore?: number;
  maxScore?: number;
  since?: string;
  before?: string;
  limit?: number;
  offset?: number;
}

export async function fetchAdminRuns(params: ListRunsParams = {}): Promise<AdminRunSummary[]> {
  const qs = new URLSearchParams();
  if (params.scope) qs.set('scope', params.scope);
  if (params.decision) qs.set('decision', params.decision);
  if (params.minScore != null) qs.set('minScore', String(params.minScore));
  if (params.maxScore != null) qs.set('maxScore', String(params.maxScore));
  if (params.since) qs.set('since', params.since);
  if (params.before) qs.set('before', params.before);
  if (params.limit != null) qs.set('limit', String(params.limit));
  if (params.offset != null) qs.set('offset', String(params.offset));
  const suffix = qs.toString();
  const resp = await fetchAdmin<{ runs?: Raw[] } | { Runs?: Raw[] }>(
    `/admin/runs${suffix ? `?${suffix}` : ''}`,
  );
  const rows = ((resp as { runs?: Raw[] }).runs ?? (resp as { Runs?: Raw[] }).Runs ?? []) as Raw[];
  return rows.map(normalizeRunSummary);
}

function normalizeRunSummary(row: Raw): AdminRunSummary {
  const calibrated = pickOpt<number>(row, ['calibratedScore', 'CalibratedScore']);
  const raw = pickOpt<number>(row, ['rawScore', 'RawScore']);
  const decision = pickOpt<string>(row, ['decision', 'Decision']);
  return {
    id: pick<string>(row, ['runId', 'RunID', 'id', 'ID'], ''),
    jobId: pickOpt<string>(row, ['jobId', 'JobID']),
    scope: pick<string>(row, ['scope', 'Scope'], ''),
    kind: pick<string>(row, ['kind', 'Kind'], 'generation'),
    modelVendor: pick<string>(row, ['modelVendor', 'ModelVendor'], ''),
    modelName: pick<string>(row, ['modelName', 'ModelName'], ''),
    status: pick<string>(row, ['status', 'Status'], ''),
    startedAt: pick<string>(row, ['startedAt', 'StartedAt'], ''),
    finishedAt: pickOpt<string>(row, ['finishedAt', 'FinishedAt']),
    latencyMs: pick<number>(row, ['latencyMs', 'LatencyMs'], 0),
    confidence:
      calibrated != null && raw != null
        ? {
            calibrated,
            raw,
            decision: asDecision(decision),
          }
        : null,
    reviewed: pick<boolean>(row, ['reviewed', 'Reviewed'], false),
  };
}

export async function fetchAdminRun(id: string): Promise<AdminRunDetail> {
  const raw = await fetchAdmin<Raw>(`/admin/runs/${encodeURIComponent(id)}`);
  return normalizeRunDetail(raw);
}

function normalizeRunDetail(row: Raw): AdminRunDetail {
  const run: AdminRunDetail['run'] = {
    id: pick<string>(row, ['runId', 'RunID', 'id', 'ID'], ''),
    jobId: pickOpt<string>(row, ['jobId', 'JobID']),
    scope: pick<string>(row, ['scope', 'Scope'], ''),
    kind: pick<string>(row, ['kind', 'Kind'], 'generation'),
    modelVendor: pick<string>(row, ['modelVendor', 'ModelVendor'], ''),
    modelName: pick<string>(row, ['modelName', 'ModelName'], ''),
    status: pick<string>(row, ['status', 'Status'], ''),
    startedAt: pick<string>(row, ['startedAt', 'StartedAt'], ''),
    finishedAt: pickOpt<string>(row, ['finishedAt', 'FinishedAt']),
    latencyMs: pick<number>(row, ['latencyMs', 'LatencyMs'], 0),
    confidence: null,
    reviewed: false,
    promptTemplate: pickOpt<string>(row, ['promptTemplate', 'PromptTemplate']),
    promptKind: (() => {
      const v = pickOpt<string>(row, ['promptKind', 'PromptKind']);
      return v == null ? null : asPromptKind(v);
    })(),
    promptVersionId: pickOpt<string>(row, ['promptVersionId', 'PromptVersionID']),
    requestPayload: pickOpt<Record<string, unknown>>(row, ['request', 'Request', 'requestPayload']),
    responsePayload: pickOpt<Record<string, unknown>>(row, [
      'response',
      'Response',
      'responsePayload',
    ]),
    errorMessage: pickOpt<string>(row, ['errorMessage', 'ErrorMessage']),
  };

  const judgesRaw = (pick<Raw[]>(row, ['judges', 'Judges'], []) ?? []) as Raw[];
  const checksRaw = (pick<Raw[]>(row, ['checks', 'Checks'], []) ?? []) as Raw[];
  const reviewsRaw = (pick<Raw[]>(row, ['humanReviews', 'HumanReviews'], []) ?? []) as Raw[];
  const confidenceRaw = pickOpt<Raw>(row, ['confidence', 'Confidence']);

  const judgeEvaluations: JudgeEvaluationEntry[] = judgesRaw.map((r) => ({
    id: pick<string>(r, ['id', 'ID'], ''),
    role: pick<string>(r, ['role', 'Role'], ''),
    rawVerdict: pickOpt<string>(r, ['rawVerdict', 'RawVerdict']),
    scores: pickOpt<Record<string, number>>(r, ['scores', 'Scores']),
    notes: pickOpt<string>(r, ['notes', 'Notes']),
    createdAt: pick<string>(r, ['createdAt', 'CreatedAt'], ''),
    modelVendor: pick<string>(r, ['modelVendor', 'ModelVendor'], ''),
    modelName: pick<string>(r, ['modelName', 'ModelName'], ''),
  }));

  const deterministicChecks: DeterministicCheckEntry[] = checksRaw.map((r) => ({
    id: pick<string>(r, ['id', 'ID'], ''),
    kind: pick<string>(r, ['kind', 'Kind'], ''),
    passed: pick<boolean>(r, ['passed', 'Passed'], false),
    score: pickOpt<number>(r, ['score', 'Score']),
    details: pickOpt<Record<string, unknown>>(r, ['details', 'Details']),
    createdAt: pick<string>(r, ['createdAt', 'CreatedAt'], ''),
  }));

  const humanReviews: HumanReviewEntry[] = reviewsRaw.map((r) => ({
    id: pick<string>(r, ['id', 'ID'], ''),
    verdict: asVerdict(pickOpt<unknown>(r, ['verdict', 'Verdict'])),
    perCriterionFlags: pickOpt<Record<string, unknown>>(r, [
      'perCriterionFlags',
      'PerCriterionFlags',
    ]),
    reviewerId: pick<string>(r, ['reviewerId', 'ReviewerID'], ''),
    notes: pickOpt<string>(r, ['notes', 'Notes']),
    createdAt: pick<string>(r, ['createdAt', 'CreatedAt'], ''),
  }));

  const confidence: ConfidenceAssessmentEntry[] = confidenceRaw
    ? [
        {
          id: pick<string>(confidenceRaw, ['id', 'ID'], ''),
          rawScore: pick<number>(confidenceRaw, ['rawScore', 'RawScore'], 0),
          calibratedScore: pick<number>(confidenceRaw, ['calibratedScore', 'CalibratedScore'], 0),
          decision: asDecision(pickOpt<unknown>(confidenceRaw, ['decision', 'Decision'])),
          features: pickOpt<Record<string, unknown>>(confidenceRaw, ['features', 'Features']),
          calibrationModelId: pickOpt<string>(confidenceRaw, [
            'calibrationModelId',
            'CalibrationModelID',
          ]),
          createdAt: pick<string>(confidenceRaw, ['createdAt', 'CreatedAt'], ''),
        },
      ]
    : [];

  if (confidence.length > 0) {
    run.confidence = {
      calibrated: confidence[0].calibratedScore,
      raw: confidence[0].rawScore,
      decision: confidence[0].decision,
    };
  }
  run.reviewed = humanReviews.length > 0;

  return {
    run,
    judgeEvaluations,
    deterministicChecks,
    humanReviews,
    confidence,
    artifactKeys: [],
  };
}

// ─── Prompts ────────────────────────────────────────────────────────────────

export async function fetchAdminPrompts(
  params: { kind?: PromptKind | ''; scope?: string } = {},
): Promise<PromptVersion[]> {
  const qs = new URLSearchParams();
  if (params.kind) qs.set('kind', params.kind);
  if (params.scope) qs.set('scope', params.scope);
  const suffix = qs.toString();
  const resp = await fetchAdmin<{ prompts?: Raw[] } | { Prompts?: Raw[] }>(
    `/admin/prompts${suffix ? `?${suffix}` : ''}`,
  );
  const rows = ((resp as { prompts?: Raw[] }).prompts ??
    (resp as { Prompts?: Raw[] }).Prompts ??
    []) as Raw[];
  return rows.map(normalizePromptVersion);
}

function normalizePromptVersion(row: Raw): PromptVersion {
  return {
    id: pick<string>(row, ['id', 'ID'], ''),
    kind: asPromptKind(pickOpt<unknown>(row, ['kind', 'Kind'])),
    scope: pick<string>(row, ['scope', 'Scope'], ''),
    template: pick<string>(row, ['template', 'Template'], ''),
    status: asPromptStatus(pickOpt<unknown>(row, ['status', 'Status'])),
    parentId: pickOpt<string>(row, ['parentId', 'ParentID']),
    rationale: pickOpt<string>(row, ['rationale', 'Rationale']),
    createdBy: pick<string>(row, ['createdBy', 'CreatedBy'], ''),
    createdAt: pick<string>(row, ['createdAt', 'CreatedAt'], ''),
    activatedAt: pickOpt<string>(row, ['activatedAt', 'ActivatedAt']),
    retiredAt: pickOpt<string>(row, ['retiredAt', 'RetiredAt']),
  };
}

// ─── Calibrations ───────────────────────────────────────────────────────────

export async function fetchAdminCalibrations(): Promise<CalibrationModel[]> {
  const resp = await fetchAdmin<{ calibrations?: Raw[] } | { Calibrations?: Raw[] }>(
    `/admin/calibrations`,
  );
  const rows = ((resp as { calibrations?: Raw[] }).calibrations ??
    (resp as { Calibrations?: Raw[] }).Calibrations ??
    []) as Raw[];
  return rows.map((r) => ({
    id: pick<string>(r, ['id', 'ID'], ''),
    scope: pick<string>(r, ['scope', 'Scope'], ''),
    kind: pick<string>(r, ['kind', 'Kind'], ''),
    trainingSetSize: pick<number>(r, ['trainingSetSize', 'TrainingSetSize'], 0),
    brier: pickOpt<number>(r, ['brier', 'Brier']),
    mae: pickOpt<number>(r, ['mae', 'MAE']),
    params: pick<Record<string, unknown>>(r, ['params', 'Params'], {}) ?? {},
    status: asCalibrationStatus(pickOpt<unknown>(r, ['status', 'Status'])),
    validFrom: pick<string>(r, ['validFrom', 'ValidFrom'], ''),
    validTo: pickOpt<string>(r, ['validTo', 'ValidTo']),
    createdAt: pick<string>(r, ['createdAt', 'CreatedAt'], ''),
  }));
}

// ─── Thresholds ─────────────────────────────────────────────────────────────

export async function fetchAdminThreshold(scope: string): Promise<RoutingThreshold> {
  const resp = await fetchAdmin<Raw>(`/admin/thresholds/${encodeURIComponent(scope)}`);
  // huma wraps the single-entity response as {threshold: ...} when the
  // response struct has a `threshold` tag; fall back to the flat shape
  // in case the envelope is omitted in future.
  const body = (resp.threshold as Raw | undefined) ?? (resp.Threshold as Raw | undefined) ?? resp;
  return {
    id: pickOpt<string>(body, ['id', 'ID']),
    scope: pick<string>(body, ['scope', 'Scope'], scope),
    autoShipMin: pick<number>(body, ['autoShipMin', 'AutoShipMin'], 0.95),
    holdMax: pick<number>(body, ['holdMax', 'HoldMax'], 0.7),
    spotCheckSampleRate: pick<number>(body, ['spotCheckSampleRate', 'SpotCheckSampleRate'], 0.05),
    updatedAt: pickOpt<string>(body, ['updatedAt', 'UpdatedAt']),
  };
}
