// @ts-nocheck
/**
 * Hermetic mock of the image-generation backend for Playwright CI.
 *
 * The Next app (SSR `service-client` AND the `/api/v1` proxy) is pointed here
 * via `BASE_API_HOSTNAME`, so a single server covers both fetch paths. Responses
 * are intentionally empty-but-well-shaped: the admin pages render their empty
 * states, which is all the a11y sweep needs. Expand the fixtures below if a page
 * starts throwing because it expects a populated field.
 *
 * Run standalone: `node test/e2e/mock-server.mjs` (defaults to :3001).
 */
import { createServer } from "node:http";

const PORT = Number(process.env.MOCK_PORT ?? 3001);

const emptyPagination = { page: 1, limit: 20, total: 0, totalPages: 0 };

/** Default list envelope satisfying both `service-client` (`.data`) and `useInfiniteList` (`.data` + `.pagination`). */
function listEnvelope() {
  return { data: [], pagination: { ...emptyPagination }, hasMore: false };
}

const emptyRatings = { data: { totalGenerations: 0, ratedGenerations: 0, distribution: [] } };
const emptyStrategyPerformance = { data: { rows: [], models: [] } };
const emptyReliability = {
  data: {
    summary: { totalRuns: 0, completedRuns: 0, failedRuns: 0, skippedRuns: 0, failureRate: 0 },
    generationErrors: { totalSteps: 0, failedSteps: 0, timedOutSteps: 0, failureRate: 0, timeoutRate: 0, errorBreakdown: [] },
    judgeErrors: { totalJudged: 0, failedJudges: 0, judgeFailureRate: 0, errorBreakdown: [] },
    trends: []
  }
};

/** Resource path with any `/image-generation/vN` (or leading slash) prefix stripped, no query string. */
function resourcePath(rawUrl) {
  const pathname = new URL(rawUrl, "http://mock.local").pathname;
  return pathname.replace(/^\/image-generation\/v\d+/, "").replace(/^\//, "");
}

function bodyFor(path) {
  if (path.startsWith("analytics/strategy-performance")) return emptyStrategyPerformance;
  if (path.startsWith("analytics/strategy-step-performance")) return emptyStrategyPerformance;
  if (path.startsWith("analytics/ratings")) return emptyRatings;
  if (path.startsWith("analytics/reliability")) return emptyReliability;
  if (path.startsWith("analytics/accuracy-trends")) return { data: [] };
  if (path.startsWith("analytics/product-category-rates")) return { data: [] };
  if (path.startsWith("analytics/strategy-errors")) return { data: [] };
  if (path.startsWith("analytics")) return { data: {} };
  if (path.startsWith("generations")) return { data: [], pagination: { ...emptyPagination } };
  // strategies, prompt-versions, input-presets, strategy-runs, strategy-batch-runs, etc.
  return listEnvelope();
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
