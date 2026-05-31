import { z } from "zod";
import { camelizeKeys } from "@/lib/casing";

/**
 * Zod schemas for image-generation API responses.
 *
 * Conventions:
 * - Schemas are intentionally lenient (`.nullish()`, `.optional()`, `.default()`,
 *   `.catch()`, `looseObject`) so a backend field going missing degrades the UI
 *   instead of throwing — matching the tolerance of the old `as any` reads.
 * - Free-form blobs (`input`, `config`, `metadata`) stay as `looseRecord` so their
 *   original keys are preserved for downstream consumers.
 * - Where the backend mixes snake/camel casing, wrap the object schema in
 *   `camelized(...)` so either casing is accepted.
 */

/** A pass-through object whose keys/values are not modeled. */
const looseRecord = z.record(z.string(), z.unknown());

/** `{ data: T }` envelope used by the v1 image-generation service. */
export const dataEnvelope = <S extends z.ZodType>(inner: S) => z.object({ data: inner });

/** Top-level key casing normalizer: accept snake_case payloads as camelCase. */
export const camelized = <S extends z.ZodType>(inner: S) => z.preprocess(camelizeKeys, inner);

// ─── Generations ───────────────────────────────────────────────────────────

const generationResultSchema = z
  .looseObject({
    id: z.string(),
    url: z.string().nullish()
  })
  .transform((result) => ({ id: result.id, url: result.url ?? "" }));

export const generationDetailSchema = z.looseObject({
  id: z.string(),
  promptVersion: z
    .looseObject({
      id: z.string().optional(),
      name: z.string().nullish(),
      systemPrompt: z.string().nullish(),
      userPrompt: z.string().nullish()
    })
    .nullish(),
  sceneAccuracyRating: z.string().nullish(),
  productAccuracyRating: z.string().nullish(),
  executionTime: z.number().nullish(),
  createdAt: z.string().catch(""),
  notes: z.string().nullish(),
  results: z
    .array(generationResultSchema)
    .nullish()
    .transform((value) => value ?? []),
  input: looseRecord.nullish()
});
export type GenerationDetail = z.infer<typeof generationDetailSchema>;

/** Just the rating fields off a generation (query + rating-patch responses). */
export const generationRatingSchema = z.looseObject({
  sceneAccuracyRating: z.string().nullish(),
  productAccuracyRating: z.string().nullish()
});

/** Paginated generations list response. Rows stay unknown — callers normalize. */
export const generationListResponseSchema = z.object({
  data: z
    .array(z.unknown())
    .nullish()
    .transform((value) => value ?? []),
  pagination: z.looseObject({ total: z.number().optional() }).nullish()
});

// ─── Evaluations ─────────────────────────────────────────────────────────────

const categoryEvalSchema = z.object({
  issues: z.array(z.string()).catch([]),
  notes: z.string().catch("")
});

const evaluationDataSchema = z.looseObject({
  productAccuracy: z.record(z.string(), categoryEvalSchema).catch({}),
  sceneAccuracyIssues: z.array(z.string()).catch([]),
  sceneAccuracyNotes: z.string().catch("")
});

export const evaluationResponseSchema = z.object({ data: evaluationDataSchema.nullish() });

// ─── Shared envelopes ────────────────────────────────────────────────────────

/** `{ error: { message } }` shape returned by failed mutations. */
export const errorEnvelopeSchema = z.looseObject({
  error: z.looseObject({ message: z.string().nullish() }).nullish()
});

/** `{ data: { id } }` returned by create/clone mutations. */
export const createdEntitySchema = z.object({ data: z.looseObject({ id: z.string() }) });

/** Combined create/clone response carrying either `{ data: { id } }` or `{ error }`. */
export const mutationResponseSchema = z.looseObject({
  data: z.looseObject({ id: z.string() }).nullish(),
  error: z.looseObject({ message: z.string().nullish() }).nullish()
});

// ─── Analytics: strategy performance ─────────────────────────────────────────

const strategyPerformanceRowSchema = z.object({
  id: z.string(),
  name: z.string().catch(""),
  model: z.string().catch(""),
  generationCount: z.number().catch(0),
  sceneRatedCount: z.number().catch(0),
  sceneGoodPct: z.number().catch(0),
  sceneFailedPct: z.number().catch(0),
  productRatedCount: z.number().catch(0),
  productGoodPct: z.number().catch(0),
  productFailedPct: z.number().catch(0),
  notRatedCount: z.number().catch(0),
  notRatedPct: z.number().catch(0),
  avgExecTimeMs: z.number().nullable().catch(null)
});

/** Response is either `{ data: rows[] }` or `{ data: { rows: rows[] } }`. */
export const strategyPerformanceResponseSchema = z.object({
  data: z.union([z.array(strategyPerformanceRowSchema), z.looseObject({ rows: z.array(strategyPerformanceRowSchema).catch([]) })]).nullish()
});

const errorItemSchema = z.object({ reason: z.string().catch(""), count: z.number().catch(0) });
const issueItemSchema = z.object({ issue: z.string().catch(""), count: z.number().catch(0) });

const ratingSummarySchema = camelized(
  z.looseObject({
    total: z.number().catch(0),
    sceneGood: z.number().catch(0),
    sceneFailed: z.number().catch(0),
    sceneUnset: z.number().catch(0),
    productGood: z.number().catch(0),
    productFailed: z.number().catch(0),
    productUnset: z.number().catch(0)
  })
);

const strategyErrorsSchema = camelized(
  z.looseObject({
    executionErrors: z.array(errorItemSchema).catch([]),
    sceneIssues: z.array(issueItemSchema).catch([]),
    productIssues: z.array(issueItemSchema).catch([]),
    ratingSummary: ratingSummarySchema.nullish()
  })
);

export const strategyErrorsResponseSchema = z.object({ data: strategyErrorsSchema.nullish() });

// ─── Analytics: reliability ──────────────────────────────────────────────────

const reasonCountSchema = z.object({ reason: z.string().catch(""), count: z.number().catch(0) });

const reliabilitySchema = z.object({
  summary: z.object({
    totalRuns: z.number().catch(0),
    completedRuns: z.number().catch(0),
    failedRuns: z.number().catch(0),
    skippedRuns: z.number().catch(0),
    failureRate: z.number().catch(0)
  }),
  generationErrors: z.object({
    totalSteps: z.number().catch(0),
    failedSteps: z.number().catch(0),
    timedOutSteps: z.number().catch(0),
    failureRate: z.number().catch(0),
    timeoutRate: z.number().catch(0),
    errorBreakdown: z.array(reasonCountSchema).catch([])
  }),
  judgeErrors: z.object({
    totalJudged: z.number().catch(0),
    failedJudges: z.number().catch(0),
    judgeFailureRate: z.number().catch(0),
    errorBreakdown: z.array(reasonCountSchema).catch([])
  }),
  trends: z
    .array(
      z.object({
        period: z.string().catch(""),
        totalRuns: z.number().catch(0),
        failedRuns: z.number().catch(0),
        timedOutSteps: z.number().catch(0),
        judgeFailures: z.number().catch(0)
      })
    )
    .catch([])
});

export const reliabilityResponseSchema = z.object({ data: reliabilitySchema.nullish() });

// ─── Analytics: accuracy trends + product category rates ─────────────────────

const accuracyTrendPointSchema = z.object({
  date: z.string().catch(""),
  sceneAccuracy: z.number().catch(0),
  productAccuracy: z.number().catch(0)
});

export const accuracyTrendsResponseSchema = z.object({
  data: z.looseObject({ trends: z.array(accuracyTrendPointSchema).catch([]) }).nullish()
});

export const productCategoryRatesResponseSchema = z.object({
  data: z.looseObject({ categories: z.unknown() }).nullish()
});

/** Generic `{ data: <record> }` envelope where the record's fields stay unknown. */
export const dataRecordEnvelopeSchema = z.object({ data: looseRecord.nullish() });

// ─── Strategy performance (strategy-detail page) ─────────────────────────────

const strategyDetailPerformanceSchema = z.object({
  generationCount: z.number().catch(0),
  sceneGoodCount: z.number().catch(0),
  sceneFailedCount: z.number().catch(0),
  sceneRatedCount: z.number().catch(0),
  productGoodCount: z.number().catch(0),
  productFailedCount: z.number().catch(0),
  productRatedCount: z.number().catch(0),
  notRatedCount: z.number().catch(0),
  sceneGoodPct: z.number().catch(0),
  sceneFailedPct: z.number().catch(0),
  productGoodPct: z.number().catch(0),
  productFailedPct: z.number().catch(0),
  notRatedPct: z.number().catch(0),
  avgExecutionTimeMs: z.number().nullable().catch(null)
});

export const strategyDetailPerformanceResponseSchema = z.object({ data: strategyDetailPerformanceSchema.nullish() });

// ─── Generation summaries (related-generations lists on detail pages) ────────

const generationSummarySchema = z.looseObject({
  id: z.string(),
  sceneAccuracyRating: z.string().nullish(),
  productAccuracyRating: z.string().nullish(),
  createdAt: z.string().catch(""),
  resultCount: z.number().nullish(),
  promptName: z.string().nullish()
});

export const generationSummaryArraySchema = z.array(generationSummarySchema).catch([]);

// ─── Prompt versions ─────────────────────────────────────────────────────────

export const promptVersionDetailSchema = z.looseObject({
  id: z.string(),
  name: z.string().nullish(),
  description: z.string().nullish(),
  systemPrompt: z.string().catch(""),
  userPrompt: z.string().catch(""),
  deletedAt: z.string().nullish(),
  stats: z
    .looseObject({
      generationCount: z.number().nullish(),
      ratedCount: z.number().nullish(),
      avgRatingScore: z.number().nullish()
    })
    .nullish()
});

/** `{ id, name }` minimal item used by selector dropdowns. */
const minimalItemSchema = z.looseObject({ id: z.string(), name: z.string().nullish() });

/** `{ data: minimal[], error? }` — minimal list response that also carries an error message. */
export const minimalListResponseSchema = z.looseObject({
  data: z.array(minimalItemSchema).catch([]),
  error: z.looseObject({ message: z.string().nullish() }).nullish()
});

// ─── Prompt preview ──────────────────────────────────────────────────────────

const dollhouseSourceSchema = z.looseObject({
  projectId: z.string().catch(""),
  projectLabel: z.string().catch(""),
  defaultAreaSummary: z.string().nullable().catch(null),
  areas: z.array(z.looseObject({ summary: z.string().catch(""), imageUrl: z.string().catch(""), priority: z.number().catch(0) })).catch([])
});

export const dollhouseSourceResponseSchema = z.object({ data: dollhouseSourceSchema.nullish() });

const previewItemSchema = z.looseObject({ systemPrompt: z.string().catch(""), userPrompt: z.string().catch("") });

export const previewResponseSchema = z.object({ data: previewItemSchema.nullish() });

// ─── Catalog product images (design settings editor) ─────────────────────────

const catalogProductImagesSchema = camelized(
  z.looseObject({
    images: z.array(z.looseObject({ url: z.string().nullish(), tag: z.string().nullish() })).catch([]),
    featuredImage: z.looseObject({ url: z.string().nullish() }).nullish()
  })
);

export const catalogProductImagesResponseSchema = z.object({ data: catalogProductImagesSchema.nullish() });

// ─── Strategy hover card ─────────────────────────────────────────────────────

export const strategyHoverSchema = z.looseObject({
  id: z.string().catch(""),
  name: z.string().catch(""),
  description: z.string().nullable().catch(null),
  model: z.string().catch(""),
  aspectRatio: z.string().catch(""),
  outputResolution: z.string().catch(""),
  temperature: z.string().nullable().catch(null),
  useGoogleSearch: z.boolean().catch(false),
  tagImages: z.boolean().catch(false),
  groupProductImages: z.boolean().catch(false),
  steps: z
    .array(
      z.looseObject({
        stepOrder: z.number().catch(0),
        name: z.string().nullable().catch(null),
        promptVersion: z
          .looseObject({ id: z.string().catch(""), name: z.string().nullable().catch(null) })
          .nullable()
          .catch(null)
      })
    )
    .catch([])
});

// ─── Strategy run summaries (runs list/matrix) ───────────────────────────────

/**
 * Loose validation for the run summaries the strategy-runs endpoint returns.
 * Fields stay lenient (`.catch`/`.nullish`); `judgeResults` stays `unknown`
 * because the caller normalizes it through `parseStrategyRunJudgeResults`.
 */
const strategyRunSummarySchema = z.looseObject({
  id: z.string().catch(""),
  status: z.string().catch(""),
  createdAt: z.string().catch(""),
  completedAt: z.string().nullish(),
  inputPresetName: z.string().nullish(),
  inputPresets: z.array(z.looseObject({ inputPresetName: z.string().nullish() })).nullish(),
  lastOutputUrl: z.string().nullish(),
  lastOutputGenerationId: z.string().nullish(),
  batchRunId: z.string().nullish(),
  groupId: z.string().nullish(),
  judgeScore: z.number().nullish(),
  isJudgeSelected: z.boolean().nullish(),
  judgeReasoning: z.string().nullish(),
  judgeOutput: z.string().nullish(),
  judgeSystemPrompt: z.string().nullish(),
  judgeUserPrompt: z.string().nullish(),
  judgeTypeUsed: z.string().nullish(),
  judgeResults: z.unknown(),
  stepResults: z.array(z.looseObject({ id: z.string().catch(""), status: z.string().catch("") })).nullish()
});
export type StrategyRunSummary = z.infer<typeof strategyRunSummarySchema>;
export const strategyRunSummaryArraySchema = z.array(strategyRunSummarySchema).catch([]);

// ─── Upload ──────────────────────────────────────────────────────────────────

export const uploadResponseSchema = z.looseObject({
  data: z.looseObject({ publicUrl: z.string().catch("") }).nullish(),
  error: z.looseObject({ message: z.string().nullish() }).nullish()
});
