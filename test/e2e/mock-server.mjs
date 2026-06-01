// @ts-nocheck
/**
 * Hermetic mock of the image-generation backend for Playwright CI.
 *
 * The Next app (SSR `service-client` AND the `/api/v1` proxy) is pointed here
 * via `BASE_API_HOSTNAME`, so a single server covers both fetch paths. Fixtures
 * are small but representative: enough rows/values that the admin pages render
 * their populated, data-rich states (tables, lists, badges, thumbnails, charts,
 * DAGs, detail pages) rather than just empty states — so the a11y + visual
 * sweeps exercise the real UI.
 *
 * Routing is ID-aware: list paths (`/strategies`) return a paginated envelope,
 * while single-resource paths (`/strategies/str_1`), sub-resources
 * (`/strategies/str_1/runs`, `/strategies/str_1/performance`), and detail
 * endpoints (`/strategy-runs/{id}`, `/generations/{id}`) return the single
 * objects those detail/run pages expect.
 *
 * Shapes mirror the types the app expects (see src/lib/service-client.ts,
 * src/lib/generation-row.ts, src/app/**\/*-types.ts, src/lib/api/schemas.ts).
 * Most query params are ignored; every list returns a single full page.
 *
 * Determinism: timestamps are anchored to a FIXED base date (not `Date.now()`),
 * so the same date text renders on every run. Combined with TZ=UTC (server) and
 * `timezoneId`/`locale` (browser) in playwright.config.ts, every rendered date —
 * including plain-text `toLocaleString()` output that no CSS rule can hide — is
 * byte-stable across runs and machines.
 *
 * Run standalone: `node test/e2e/mock-server.mjs` (defaults to :3001).
 */
import { createServer } from "node:http";

const PORT = Number(process.env.MOCK_PORT ?? 3001);

// 1x1 transparent PNG — a valid <img> src so thumbnails load (and we exercise
// their alt handling) without any network dependency.
const IMG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

// Fixed anchor so relative `iso(daysAgo)` values never drift between runs.
const BASE_MS = Date.parse("2026-01-15T12:00:00.000Z");
const iso = (daysAgo) => new Date(BASE_MS - daysAgo * 86_400_000).toISOString();

/** List envelope satisfying `service-client` (`.data`), `useInfiniteList` (`.data` + `.pagination`), and infinite-scroll (`hasMore`). */
function list(rows) {
  return { data: rows, pagination: { page: 1, limit: 20, total: rows.length, totalPages: 1 }, hasMore: false };
}

const STRATEGIES = [
  { id: "str_1", name: "Modern Bathroom v3", description: "Three-step refinement with scene-accuracy check.", activeForSource: "photo", isActive: true, createdAt: iso(2), stepCount: 3, runCount: 124 },
  { id: "str_2", name: "Kitchen Hero Shot", description: "Single-pass generation tuned for product fidelity.", activeForSource: "pdp", isActive: true, createdAt: iso(9), stepCount: 1, runCount: 58 },
  { id: "str_3", name: "Legacy Living Room", description: null, activeForSource: null, isActive: false, createdAt: iso(40), stepCount: 2, runCount: 12 }
];

const PROMPT_VERSIONS = [
  {
    id: "pv_1",
    name: "Hero Prompt",
    systemPrompt: "You are an interior visualization model.",
    userPrompt: "Render the room from the dollhouse view.",
    description: "Primary production prompt.",
    generationCount: 220,
    createdAt: iso(3),
    deletedAt: null
  },
  { id: "pv_2", name: "Detail Refiner", systemPrompt: "Refine fine details and lighting.", userPrompt: "Improve material realism.", description: null, generationCount: 64, createdAt: iso(14), deletedAt: null },
  { id: "pv_3", name: null, systemPrompt: "Experimental.", userPrompt: "Try a wide-angle composition.", description: "Draft.", generationCount: 3, createdAt: iso(30), deletedAt: null }
];

const INPUT_PRESETS = [
  { id: "ip_1", name: "Bathroom A", description: "Standard 3-image bathroom preset.", layoutTypeId: "lt_1", dollhouseView: IMG, realPhoto: null, moodBoard: null, createdAt: iso(5), imageCount: 3, stats: { generationCount: 48 } },
  { id: "ip_2", name: "Kitchen Loft", description: null, layoutTypeId: "lt_2", dollhouseView: IMG, realPhoto: IMG, moodBoard: null, createdAt: iso(11), imageCount: 5, stats: { generationCount: 17 } },
  { id: "ip_3", name: "Studio Bedroom", description: "Mood-board driven.", layoutTypeId: null, dollhouseView: null, realPhoto: null, moodBoard: IMG, createdAt: iso(22), imageCount: 2, stats: { generationCount: 4 } }
];

const GENERATIONS = [
  { id: "gen_1", promptVersionId: "pv_1", promptName: "Hero Prompt", sceneAccuracyRating: "GOOD", productAccuracyRating: "GOOD", notes: null, executionTime: 38_000, createdAt: iso(1), resultUrls: [IMG, IMG], resultCount: 2 },
  {
    id: "gen_2",
    promptVersionId: "pv_1",
    promptName: "Hero Prompt",
    sceneAccuracyRating: "FAILED",
    productAccuracyRating: "GOOD",
    notes: "Window proportions off.",
    executionTime: 51_200,
    createdAt: iso(1),
    resultUrls: [IMG],
    resultCount: 1
  },
  { id: "gen_3", promptVersionId: "pv_2", promptName: "Detail Refiner", sceneAccuracyRating: null, productAccuracyRating: null, notes: null, executionTime: null, createdAt: iso(2), resultUrls: [IMG], resultCount: 1 }
];

const AUDIT_RUNS = [
  {
    id: "aurun_1",
    batchRunId: "batch_1",
    groupId: "grp_1",
    strategyId: "str_1",
    strategyName: "Modern Bathroom v3",
    status: "completed",
    createdAt: iso(1),
    source: "preset",
    inputPresetName: "Bathroom A",
    lastOutputUrl: IMG,
    judgeScore: 8
  },
  {
    id: "aurun_2",
    batchRunId: "batch_1",
    groupId: "grp_1",
    strategyId: "str_1",
    strategyName: "Modern Bathroom v3",
    status: "completed",
    createdAt: iso(1),
    source: "preset",
    inputPresetName: "Bathroom A",
    lastOutputUrl: IMG,
    judgeScore: 6
  },
  { id: "aurun_3", batchRunId: null, groupId: null, strategyId: "str_2", strategyName: "Kitchen Hero Shot", status: "failed", createdAt: iso(3), source: "raw_input", inputPresetName: null, lastOutputUrl: null, judgeScore: null }
];

const runRow = (id, overrides = {}) => ({
  id,
  batchRunId: "batch_1",
  strategyId: "str_1",
  strategyName: "Modern Bathroom v3",
  runHref: null,
  status: "completed",
  createdAt: iso(1),
  completedAt: iso(1),
  inputPresetName: "Bathroom A",
  source: "preset",
  lastOutputUrl: IMG,
  lastOutputGenerationId: "gen_1",
  stepResults: [
    { id: "step_1", status: "completed" },
    { id: "step_2", status: "completed" }
  ],
  totalGenerations: 2,
  ratedGenerations: 2,
  judgeScore: 8,
  isJudgeSelected: true,
  judgeReasoning: "Best lighting and proportions.",
  judgeOutput: null,
  judgeSystemPrompt: null,
  judgeUserPrompt: null,
  judgeTypeUsed: "individual",
  ...overrides
});

const BATCHES = [
  {
    id: "batch_1",
    name: "Bathroom benchmark run",
    strategyId: "str_1",
    strategies: [{ id: "str_1", name: "Modern Bathroom v3" }],
    numberOfImages: 2,
    createdAt: iso(1),
    status: "completed",
    totalRuns: 2,
    completedRuns: 2,
    failedRuns: 0,
    runs: [runRow("aurun_1"), runRow("aurun_2", { judgeScore: 6, isJudgeSelected: false, lastOutputGenerationId: "gen_2" })]
  }
];

/** Summaries for the strategy-detail runs section (`/strategies/{id}/runs`). */
const STRATEGY_RUN_SUMMARIES = [runRow("aurun_1"), runRow("aurun_2", { judgeScore: 6, isJudgeSelected: false, lastOutputGenerationId: "gen_2" })];

const STRATEGY_PERFORMANCE = {
  models: ["gemini-2.5-flash-image", "gpt-image-1"],
  rows: [
    {
      id: "str_1",
      name: "Modern Bathroom v3",
      model: "gemini-2.5-flash-image",
      generationCount: 124,
      sceneRatedCount: 80,
      sceneGoodPct: 82,
      sceneFailedPct: 18,
      productRatedCount: 80,
      productGoodPct: 76,
      productFailedPct: 24,
      notRatedCount: 44,
      notRatedPct: 35,
      avgExecTimeMs: 42_000
    },
    {
      id: "str_2",
      name: "Kitchen Hero Shot",
      model: "gpt-image-1",
      generationCount: 58,
      sceneRatedCount: 40,
      sceneGoodPct: 70,
      sceneFailedPct: 30,
      productRatedCount: 40,
      productGoodPct: 65,
      productFailedPct: 35,
      notRatedCount: 18,
      notRatedPct: 31,
      avgExecTimeMs: 28_500
    }
  ]
};

/** Single-strategy performance card on the strategy-detail page (`/strategies/{id}/performance`). */
const STRATEGY_DETAIL_PERFORMANCE = {
  generationCount: 124,
  sceneGoodCount: 66,
  sceneFailedCount: 14,
  sceneRatedCount: 80,
  productGoodCount: 61,
  productFailedCount: 19,
  productRatedCount: 80,
  notRatedCount: 44,
  sceneGoodPct: 82,
  sceneFailedPct: 18,
  productGoodPct: 76,
  productFailedPct: 24,
  notRatedPct: 35,
  avgExecutionTimeMs: 42_000
};

const judge = (id, overrides = {}) => ({
  id,
  strategyId: "str_1",
  name: "Scene accuracy judge",
  judgeModel: "gemini-2.5-flash",
  judgeType: "individual",
  judgePromptVersionId: "pv_2",
  judgePromptVersionName: "Detail Refiner",
  toleranceThreshold: 7,
  position: 1,
  createdAt: iso(2),
  updatedAt: iso(2),
  ...overrides
});

const genStep = (id, stepOrder, overrides = {}) => ({
  id,
  stepOrder,
  type: "generation",
  numberOfImages: 2,
  name: `Step ${stepOrder}`,
  promptVersionId: "pv_1",
  promptVersionName: "Hero Prompt",
  model: "gemini-2.5-flash-image",
  aspectRatio: "1:1",
  outputResolution: "1024x1024",
  temperature: "0.7",
  useGoogleSearch: false,
  tagImages: true,
  dollhouseViewFromStep: null,
  realPhotoFromStep: null,
  moodBoardFromStep: null,
  includeDollhouse: true,
  includeRealPhoto: false,
  includeMoodBoard: false,
  includeProductImages: true,
  includeProductCategories: ["vanity", "faucet"],
  productImageTypes: {},
  arbitraryImageFromStep: null,
  judges: [],
  ...overrides
});

/** Full strategy-detail payload (`/strategies/{id}`): settings, steps, judge step → drives the DAG. */
const STRATEGY_DETAIL = {
  id: "str_1",
  name: "Modern Bathroom v3",
  description: "Three-step refinement with scene-accuracy check.",
  activeForSource: "photo",
  isActive: true,
  createdAt: iso(2),
  deletedAt: null,
  model: "gemini-2.5-flash-image",
  aspectRatio: "1:1",
  outputResolution: "1024x1024",
  temperature: "0.7",
  useGoogleSearch: false,
  tagImages: true,
  groupProductImages: false,
  checkSceneAccuracy: true,
  enableMultiTurnContext: false,
  previewModel: "gemini-2.5-flash-image",
  previewResolution: "512x512",
  runCount: 124,
  steps: [
    genStep("step_1", 1, { name: "Base render" }),
    genStep("step_2", 2, { name: "Detail refine", promptVersionId: "pv_2", promptVersionName: "Detail Refiner", dollhouseViewFromStep: 1 }),
    {
      id: "step_3",
      stepOrder: 3,
      type: "judge",
      numberOfImages: null,
      name: "Quality judge",
      promptVersionId: null,
      promptVersionName: null,
      model: "",
      aspectRatio: "",
      outputResolution: "",
      temperature: null,
      useGoogleSearch: false,
      tagImages: false,
      dollhouseViewFromStep: null,
      realPhotoFromStep: null,
      moodBoardFromStep: null,
      includeDollhouse: false,
      includeRealPhoto: false,
      includeMoodBoard: false,
      includeProductImages: false,
      includeProductCategories: [],
      productImageTypes: {},
      arbitraryImageFromStep: null,
      judges: [judge("judge_1")]
    }
  ]
};

const stepResult = (id, stepOrder, overrides = {}) => ({
  id,
  status: "completed",
  outputUrl: IMG,
  error: null,
  executionTime: 38_000,
  generationId: "gen_1",
  isJudgeSelected: stepOrder === 1,
  processedUserPrompt: "Render the room from the dollhouse view.",
  processedSystemPrompt: "You are an interior visualization model.",
  inputImages: [{ url: IMG, label: "Dollhouse view" }],
  requestConfig: { model: "gemini-2.5-flash-image", temperature: 0.7 },
  step: {
    stepOrder,
    name: `Step ${stepOrder}`,
    model: "gemini-2.5-flash-image",
    aspectRatio: "1:1",
    outputResolution: "1024x1024",
    temperature: "0.7",
    dollhouseViewFromStep: null,
    realPhotoFromStep: null,
    moodBoardFromStep: null,
    promptVersion: { id: "pv_1", name: "Hero Prompt" }
  },
  segmentation: null,
  ...overrides
});

/**
 * Full run payload for both the run-detail page (`/strategy-runs/{id}`) and the
 * compare view. `strategy.id` is "str_1" so `/strategies/str_1/runs/{id}` matches.
 */
const runDetail = (id, overrides = {}) => ({
  id,
  status: "completed",
  createdAt: iso(1),
  startedAt: iso(1),
  completedAt: iso(1),
  judgeScore: 8,
  isJudgeSelected: true,
  judgeReasoning: "Best lighting and proportions; product geometry matches the reference.",
  judgeOutput: null,
  source: "preset",
  judgeSystemPrompt: "You are a strict interior-design judge.",
  judgeUserPrompt: "Rate scene accuracy from 1-10 and explain.",
  judgeInputImages: [{ url: IMG, label: "Reference" }],
  judgeTypeUsed: "individual",
  judgeResults: null,
  strategy: {
    id: "str_1",
    name: "Modern Bathroom v3",
    model: "gemini-2.5-flash-image",
    aspectRatio: "1:1",
    outputResolution: "1024x1024",
    temperature: "0.7",
    useGoogleSearch: false,
    tagImages: true
  },
  stepResults: [stepResult("sr_1", 1), stepResult("sr_2", 2, { generationId: "gen_2", isJudgeSelected: false, step: { ...stepResult("sr_2", 2).step, name: "Step 2", promptVersion: { id: "pv_2", name: "Detail Refiner" } } })],
  ...overrides
});

const GENERATION_DETAIL = {
  id: "gen_1",
  promptVersion: { id: "pv_1", name: "Hero Prompt", systemPrompt: "You are an interior visualization model.", userPrompt: "Render the room from the dollhouse view." },
  sceneAccuracyRating: "GOOD",
  productAccuracyRating: "GOOD",
  executionTime: 38_000,
  createdAt: iso(1),
  notes: "Lighting and proportions look great.",
  results: [
    { id: "res_1", url: IMG },
    { id: "res_2", url: IMG }
  ],
  input: { dollhouseView: IMG }
};

const PROMPT_VERSION_DETAIL = {
  id: "pv_1",
  name: "Hero Prompt",
  description: "Primary production prompt.",
  systemPrompt: "You are an interior visualization model. Honor the dollhouse layout exactly.",
  userPrompt: "Render the room from the dollhouse view with the selected products.",
  deletedAt: null,
  stats: { generationCount: 220, ratedCount: 120, avgRatingScore: 0.82 }
};

const INPUT_PRESET_DETAIL = {
  id: "ip_1",
  name: "Bathroom A",
  description: "Standard 3-image bathroom preset.",
  layoutTypeId: "lt_1",
  pkgId: "pkg_1",
  dollhouseView: IMG,
  realPhoto: IMG,
  moodBoard: null,
  deletedAt: null,
  createdAt: iso(5),
  vanity: "prod_vanity_1",
  vanityImageType: "featured-image",
  vanities_url: IMG,
  faucet: "prod_faucet_1",
  faucetImageType: "featured-image",
  faucets_url: IMG,
  paint: "Alabaster White",
  stats: { generationCount: 48 }
};

const DOLLHOUSE_SOURCE = {
  projectId: "proj_1",
  projectLabel: "Demo Bathroom Project",
  defaultAreaSummary: "Primary bathroom",
  areas: [
    { summary: "Primary bathroom", imageUrl: IMG, priority: 1 },
    { summary: "Powder room", imageUrl: IMG, priority: 2 }
  ]
};

const PREVIEW_ITEM = {
  systemPrompt: "You are an interior visualization model. Honor the dollhouse layout exactly.",
  userPrompt: "Render the primary bathroom from the dollhouse view with the selected vanity and faucet."
};

/** Fixed-date chart series so axis labels never drift. */
const ACCURACY_TRENDS = [
  { date: "2026-01-08", sceneAccuracy: 74, productAccuracy: 68 },
  { date: "2026-01-09", sceneAccuracy: 78, productAccuracy: 71 },
  { date: "2026-01-10", sceneAccuracy: 81, productAccuracy: 76 },
  { date: "2026-01-11", sceneAccuracy: 79, productAccuracy: 74 },
  { date: "2026-01-12", sceneAccuracy: 83, productAccuracy: 77 }
];

const PRODUCT_CATEGORY_RATES = [
  { name: "Vanity", total: 60, success: 49, failure: 11, successPct: 82, failurePct: 18, issues: [{ issue: "wrong finish", count: 6 }], notes: [{ text: "Handles slightly off", count: 3 }], notesTruncated: false },
  { name: "Faucet", total: 60, success: 42, failure: 18, successPct: 70, failurePct: 30, issues: [{ issue: "spout shape", count: 9 }], notes: [], notesTruncated: false },
  { name: "Mirror", total: 40, success: 35, failure: 5, successPct: 88, failurePct: 12, issues: [], notes: [], notesTruncated: false }
];

const RELIABILITY = {
  summary: { totalRuns: 182, completedRuns: 170, failedRuns: 8, skippedRuns: 4, failureRate: 4 },
  generationErrors: { totalSteps: 360, failedSteps: 10, timedOutSteps: 2, failureRate: 3, timeoutRate: 1, errorBreakdown: [{ reason: "content_filter", count: 6 }] },
  judgeErrors: { totalJudged: 90, failedJudges: 3, judgeFailureRate: 3, errorBreakdown: [{ reason: "timeout", count: 3 }] },
  trends: [
    { period: "2026-W01", totalRuns: 60, failedRuns: 3, timedOutSteps: 1, judgeFailures: 1 },
    { period: "2026-W02", totalRuns: 62, failedRuns: 2, timedOutSteps: 0, judgeFailures: 1 },
    { period: "2026-W03", totalRuns: 60, failedRuns: 3, timedOutSteps: 1, judgeFailures: 1 }
  ]
};

const ratings = () => ({
  totalGenerations: 182,
  ratedGenerations: 120,
  distribution: [
    { rating: "GOOD", count: 86, percentage: 72 },
    { rating: "FAILED", count: 34, percentage: 28 }
  ]
});

const providerModel = (id, providerKey, displayName, useCase) => ({
  id,
  providerId: `prov_${providerKey}`,
  providerKey,
  providerDisplayName: providerKey,
  providerModelId: id,
  displayName,
  shortName: displayName,
  description: null,
  status: "active",
  metadata: {},
  useCases: [{ id: `${id}_uc`, useCase, productAvailable: true, isDefault: true, config: {}, sortOrder: 0 }],
  createdAt: iso(60),
  updatedAt: iso(2),
  deletedAt: null
});

// The catalog endpoint is queried three times (one per use case); params are
// ignored, so every call gets the full set and each dropdown is populated.
const PROVIDER_MODELS = [
  providerModel("gemini-2.5-flash-image", "gemini", "Gemini 2.5 Flash Image", "IMAGE_GENERATION"),
  providerModel("gpt-image-1", "openai", "GPT Image 1", "IMAGE_GENERATION"),
  providerModel("gemini-2.5-flash", "gemini", "Gemini 2.5 Flash", "JUDGING"),
  providerModel("gemini-2.5-flash-preview", "gemini", "Gemini 2.5 Flash Preview", "PREVIEW_IMAGE_GENERATION")
];

/** Resource path with any `/image-generation/vN` (or leading slash) prefix stripped, no query string. */
function resourcePath(rawUrl) {
  const pathname = new URL(rawUrl, "http://mock.local").pathname;
  return pathname.replace(/^\/image-generation\/v\d+/, "").replace(/^\//, "");
}

function analyticsBody(segments) {
  const sub = segments[1] ?? "";
  if (sub === "strategy-performance" || sub === "strategy-step-performance") return { data: STRATEGY_PERFORMANCE };
  if (sub === "ratings") return { data: ratings() };
  if (sub === "reliability") return { data: RELIABILITY };
  if (sub === "accuracy-trends") return { data: { trends: ACCURACY_TRENDS } };
  if (sub === "product-category-rates") return { data: { categories: PRODUCT_CATEGORY_RATES } };
  if (sub === "strategy-errors") return { data: { executionErrors: [], sceneIssues: [{ issue: "window proportions", count: 4 }], productIssues: [{ issue: "wrong finish", count: 6 }], ratingSummary: null } };
  return { data: {} };
}

function strategyRunsBody(second) {
  if (second === "compare") return { data: { left: runDetail("aurun_1"), right: runDetail("aurun_2", { judgeScore: 6, isJudgeSelected: false }) } };
  if (second) return { data: runDetail(second) };
  return list(AUDIT_RUNS);
}

function strategiesBody(second, third) {
  if (!second) return list(STRATEGIES);
  if (third === "runs") return list(STRATEGY_RUN_SUMMARIES);
  if (third === "performance") return { data: STRATEGY_DETAIL_PERFORMANCE };
  return { data: STRATEGY_DETAIL };
}

function promptVersionsBody(second, third) {
  if (second === "preview") return { data: (third ?? "").startsWith("dollhouse") ? DOLLHOUSE_SOURCE : PREVIEW_ITEM };
  if (second) return { data: PROMPT_VERSION_DETAIL };
  return list(PROMPT_VERSIONS);
}

/** Per-top-level-segment handlers; each receives the path segments after the head. */
const HANDLERS = {
  providers: (second) => (second === "models" ? { data: PROVIDER_MODELS } : list([])),
  analytics: (_second, _third, segments) => analyticsBody(segments),
  "strategy-runs": (second) => strategyRunsBody(second),
  "strategy-batch-runs": (second) => (second ? { data: BATCHES[0] } : list(BATCHES)),
  strategies: (second, third) => strategiesBody(second, third),
  "prompt-versions": (second, third) => promptVersionsBody(second, third),
  "input-presets": (second) => (second ? { data: INPUT_PRESET_DETAIL } : list(INPUT_PRESETS)),
  generations: (second) => (second ? { data: GENERATION_DETAIL } : list(GENERATIONS))
};

function bodyFor(path) {
  const segments = path.split("/").filter(Boolean);
  const [head, second, third] = segments;
  const handler = HANDLERS[head];
  // Unknown resource → safe empty list envelope.
  return handler ? handler(second, third, segments) : list([]);
}

const server = createServer((req, res) => {
  const path = resourcePath(req.url ?? "/");
  res.writeHead(200, { "content-type": "application/json" });
  res.end(JSON.stringify(bodyFor(path)));
});

server.listen(PORT, () => {
  console.log(`[mock-server] image-generation backend mock listening on http://localhost:${PORT}`);
});
