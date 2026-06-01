// @ts-nocheck
/**
 * Hermetic mock of the image-generation backend for Playwright CI.
 *
 * The Next app (SSR `service-client` AND the `/api/v1` proxy) is pointed here
 * via `BASE_API_HOSTNAME`, so a single server covers both fetch paths. Fixtures
 * are small but representative: enough rows/values that the admin pages render
 * their populated, data-rich states (tables, lists, badges, thumbnails, charts)
 * rather than just empty states — so the a11y sweep exercises the real UI.
 *
 * Shapes mirror the types the app expects (see src/lib/service-client.ts,
 * src/lib/generation-row.ts, src/app/**\/*-types.ts, src/lib/api/schemas.ts).
 * Query params are ignored; every list returns a single full page.
 *
 * Run standalone: `node test/e2e/mock-server.mjs` (defaults to :3001).
 */
import { createServer } from "node:http";

const PORT = Number(process.env.MOCK_PORT ?? 3001);

// 1x1 transparent PNG — a valid <img> src so thumbnails load (and we exercise
// their alt handling) without any network dependency.
const IMG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

const iso = (daysAgo) => new Date(Date.now() - daysAgo * 86_400_000).toISOString();

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

const ratings = () => ({
  totalGenerations: 182,
  ratedGenerations: 120,
  distribution: [
    { rating: "GOOD", count: 86, percentage: 72 },
    { rating: "FAILED", count: 34, percentage: 28 }
  ]
});

const RELIABILITY = {
  summary: { totalRuns: 182, completedRuns: 170, failedRuns: 8, skippedRuns: 4, failureRate: 4 },
  generationErrors: { totalSteps: 360, failedSteps: 10, timedOutSteps: 2, failureRate: 3, timeoutRate: 1, errorBreakdown: [{ reason: "content_filter", count: 6 }] },
  judgeErrors: { totalJudged: 90, failedJudges: 3, judgeFailureRate: 3, errorBreakdown: [{ reason: "timeout", count: 3 }] },
  trends: []
};

/** Resource path with any `/image-generation/vN` (or leading slash) prefix stripped, no query string. */
function resourcePath(rawUrl) {
  const pathname = new URL(rawUrl, "http://mock.local").pathname;
  return pathname.replace(/^\/image-generation\/v\d+/, "").replace(/^\//, "");
}

function bodyFor(path) {
  // Analytics (objects under `data`)
  if (path.startsWith("analytics/strategy-performance") || path.startsWith("analytics/strategy-step-performance")) return { data: STRATEGY_PERFORMANCE };
  if (path.startsWith("analytics/ratings")) return { data: ratings() };
  if (path.startsWith("analytics/reliability")) return { data: RELIABILITY };
  if (path.startsWith("analytics/accuracy-trends")) return { data: [] };
  if (path.startsWith("analytics/product-category-rates")) return { data: [] };
  if (path.startsWith("analytics/strategy-errors")) return { data: { executionErrors: [], sceneIssues: [], productIssues: [], ratingSummary: null } };
  if (path.startsWith("analytics")) return { data: {} };

  // Lists
  if (path.startsWith("strategy-batch-runs")) return list(BATCHES);
  if (path.startsWith("strategy-runs")) return list(AUDIT_RUNS);
  if (path.startsWith("strategies")) return list(STRATEGIES);
  if (path.startsWith("prompt-versions")) return list(PROMPT_VERSIONS);
  if (path.startsWith("input-presets")) return list(INPUT_PRESETS);
  if (path.startsWith("generations")) return list(GENERATIONS);

  // Unknown: safe empty list envelope.
  return list([]);
}

const server = createServer((req, res) => {
  const path = resourcePath(req.url ?? "/");
  res.writeHead(200, { "content-type": "application/json" });
  res.end(JSON.stringify(bodyFor(path)));
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[mock-server] image-generation backend mock listening on http://localhost:${PORT}`);
});
