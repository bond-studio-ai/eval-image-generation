// Merge raw V8 coverage from every test runner into one report and enforce the
// ratchet. Reads the raw dirs declared in mcr.config.mjs (Vitest unit/functional
// + Playwright E2E client/server), skipping any that are absent so the merge
// still runs when only a subset of suites produced data (e.g. unit-only locally).

import fs from "node:fs";

import { CoverageReport } from "monocart-coverage-reports";

import coverageOptions, { RAW_DIRS } from "../mcr.config.mjs";

const present = RAW_DIRS.filter((dir) => fs.existsSync(dir) && fs.readdirSync(dir).length > 0);
const missing = RAW_DIRS.filter((dir) => !present.includes(dir));

if (missing.length > 0) {
  console.warn(`merge-coverage: no raw data in ${missing.join(", ")} — merging the rest.`);
}

if (present.length === 0) {
  console.error("merge-coverage: no raw coverage found. Run the suites with COVERAGE_RAW=1 first.");
  process.exit(1);
}

const report = new CoverageReport({ ...coverageOptions, inputDir: present });
await report.generate();
