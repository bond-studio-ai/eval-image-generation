import type { CoverageReportOptions } from "monocart-coverage-reports";

/**
 * Shared options for the E2E coverage `raw` report.
 *
 * Both the client fixture (per worker) and `global-teardown` (server side) add
 * their raw V8 data to a `CoverageReport` built from these options; MCR's
 * multiprocessing support funnels every worker's data into `.coverage-raw/e2e/.cache`,
 * and `global-teardown` calls `generate()` once to emit the `raw` report at
 * `.coverage-raw/e2e/raw`. Source-map resolution and `src/**` filtering happen
 * later, at the final merge (mcr.config.mjs) — this stage only preserves raw data.
 */
export const E2E_RAW_OPTIONS: CoverageReportOptions = {
  name: "E2E Coverage (raw)",
  outputDir: ".coverage-raw/e2e",
  reports: [["raw", { outputDir: "raw" }]]
};
