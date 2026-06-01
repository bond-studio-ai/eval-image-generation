// Merged coverage report config (monocart-coverage-reports).
//
// This is the SOURCE OF TRUTH for the combined Vitest (unit + functional) and
// Playwright (E2E client + server) coverage picture. Each test runner writes
// raw V8 data into `.coverage-raw/<runner>/raw`; `scripts/merge-coverage.mjs`
// feeds those dirs in via `inputDir`, MCR merges by source file, maps through
// source maps, filters to `src/**`, and `onEnd` enforces the ratchet.
//
// The numbers below are the MERGED floor (unit + E2E), enforced in CI. They are
// distinct from the unit-only floor in vitest.config.ts AND are measured on a
// different scale: MCR reports native V8 metrics, which do not line up with
// Vitest's istanbul-style line/statement counts (e.g. unit-only here is ~29%
// lines / ~86% statements under V8).
//
// PROVISIONAL: these are deliberately loose so the FIRST merged CI run is green.
// They MUST be ratcheted up to the achieved numbers once that run reports the
// real merged (unit + E2E) coverage — see the validate step in the plan.

export const RAW_DIRS = [".coverage-raw/unit/raw", ".coverage-raw/e2e/raw"];

export const thresholds = {
  statements: 30,
  branches: 25,
  functions: 30,
  lines: 20
};

/** @type {import('monocart-coverage-reports').CoverageReportOptions} */
const coverageOptions = {
  name: "Merged Coverage (unit + E2E)",
  inputDir: RAW_DIRS,
  outputDir: "coverage",
  reports: [["v8"], ["html"], ["lcovonly"], ["console-summary"]],

  // Keep only our own source. `entryFilter` drops bundled vendor/runtime entries
  // before sourcemap unpacking; `sourceFilter` keeps only files under src/ after.
  entryFilter: {
    "**/node_modules/**": false,
    "**/*": true
  },
  sourceFilter: {
    "**/node_modules/**": false,
    "**/src/**": true,
    "**/*": false
  },

  // Count every source file (untested files show as 0%) so the metric reflects
  // the whole repo, matching the old Vitest `include: src/**` behavior.
  all: {
    dir: ["src"],
    filter: {
      "**/*.{ts,tsx}": true,
      "**/*.d.ts": false,
      "**/*.test.{ts,tsx}": false,
      "**/__tests__/**": false,
      "**/__mocks__/**": false,
      "**/*": false
    }
  },

  onEnd: (coverageResults) => {
    const { summary } = coverageResults;
    const errors = [];
    for (const key of Object.keys(thresholds)) {
      const pct = summary[key]?.pct ?? 0;
      if (pct < thresholds[key]) {
        errors.push(`  - ${key}: ${pct}% < ${thresholds[key]}% (floor)`);
      }
    }
    if (errors.length > 0) {
      console.error(`\nMerged coverage below ratchet:\n${errors.join("\n")}\n`);
      process.exitCode = 1;
    }
  }
};

export default coverageOptions;
