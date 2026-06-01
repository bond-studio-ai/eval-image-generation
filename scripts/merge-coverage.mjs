// Merge raw V8 coverage from every test runner into one report and enforce the
// ratchet. Reads the raw dirs declared in mcr.config.mjs (Vitest unit/functional
// + Playwright E2E client/server).
//
// Strict mode (the default in CI, or with `--strict`) requires EVERY RAW_DIRS
// entry to be present: the authoritative merged ratchet must not silently pass
// on a missing suite (e.g. a broken E2E reporter producing unit-only numbers).
// Locally the merge is lenient so you can preview a partial run; pass
// `--allow-partial` to force lenient mode even in CI.

import fs from "node:fs";

import { CoverageReport } from "monocart-coverage-reports";

import coverageOptions, { RAW_DIRS } from "../mcr.config.mjs";

const allowPartial = process.argv.includes("--allow-partial");
const strict = !allowPartial && (Boolean(process.env.CI) || process.argv.includes("--strict"));

const present = RAW_DIRS.filter((dir) => fs.existsSync(dir) && fs.readdirSync(dir).length > 0);
const missing = RAW_DIRS.filter((dir) => !present.includes(dir));

if (missing.length > 0) {
  if (strict) {
    console.error(`merge-coverage: missing raw coverage for ${missing.join(", ")}. Every suite must produce data in strict mode (CI). Re-run the failing suite, or pass --allow-partial to merge anyway.`);
    process.exit(1);
  }
  console.warn(`merge-coverage: no raw data in ${missing.join(", ")} — merging the rest (partial).`);
}

if (present.length === 0) {
  console.error("merge-coverage: no raw coverage found. Run the suites with COVERAGE_RAW=1 first.");
  process.exit(1);
}

const report = new CoverageReport({ ...coverageOptions, inputDir: present });
await report.generate();
