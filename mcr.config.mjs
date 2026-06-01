// Merged coverage report config (monocart-coverage-reports).
//
// This is the SOURCE OF TRUTH for the combined Vitest (unit + functional) and
// Playwright (E2E client + server) coverage picture. Each test runner writes
// raw V8 data into `.coverage-raw/<runner>/raw`; `scripts/merge-coverage.mjs`
// feeds those dirs in via `inputDir`, MCR merges by source file, maps through
// source maps, filters to `src/**`, and `onEnd` enforces the ratchet.
//
// The numbers below are the MERGED floor (unit + E2E), enforced in CI. Untested
// files are compiled (see `all.transformer`) so every metric is computed over
// the whole `src/**` tree — keeping statements/branches/functions/lines
// consistent with each other and roughly in line with Vitest's own numbers.
//
// PROVISIONAL: seeded just under the unit-only merged numbers (a safe lower
// bound, since adding E2E coverage only raises them). Ratchet them up to the
// achieved numbers once the first merged CI run (unit + E2E) reports them.

import { transform } from "esbuild";
import fs from "node:fs";
import path from "node:path";

export const RAW_DIRS = [".coverage-raw/unit/raw", ".coverage-raw/e2e/raw"];

// esbuild loader per source extension, so untested .ts/.tsx files (added via
// `all`) can be compiled to JS for MCR's AST parser.
const LOADER_BY_EXT = {
  ".ts": "ts",
  ".tsx": "tsx",
  ".jsx": "jsx",
  ".js": "js",
  ".mjs": "js",
  ".cjs": "js"
};

// Compile untested source so MCR computes statements/branches/functions for it
// too — not just physical lines. Without this, untested TS/TSX files contribute
// only to the "lines" denominator, making statements/branches/functions reflect
// just the executed files (inflated) while lines reflects the whole repo.
async function compileUntestedFile(entry) {
  const loader = LOADER_BY_EXT[path.extname(entry.url)] ?? "ts";
  try {
    const { code, map } = await transform(entry.source, { loader, sourcemap: true, sourcefile: entry.url });
    entry.source = code;
    entry.sourceMap = JSON.parse(map);
  } catch (error) {
    // Leave the raw source in place (line-only coverage for this one file)
    // rather than failing the whole report.
    console.error(`coverage: failed to compile ${entry.url} for AST metrics`, error);
  }
}

export const thresholds = {
  statements: 35,
  branches: 28,
  functions: 28,
  lines: 30
};

// Order the markdown/summary rows the way humans read them (lines first).
const SUMMARY_METRICS = [
  { key: "lines", label: "Lines" },
  { key: "statements", label: "Statements" },
  { key: "branches", label: "Branches" },
  { key: "functions", label: "Functions" },
  { key: "bytes", label: "Bytes" }
];

function statusFor(pct, floor) {
  if (floor === undefined) {
    return "—";
  }
  return pct >= floor ? "✅" : "❌";
}

// Render a Markdown summary so the top-level numbers show up where people look —
// the GitHub Actions job summary and a sticky PR comment — instead of CI logs.
function renderMarkdown(summary) {
  const rows = SUMMARY_METRICS.map(({ key, label }) => {
    const metric = summary[key] ?? {};
    const pct = typeof metric.pct === "number" ? metric.pct : 0;
    const floor = thresholds[key];
    const floorText = floor === undefined ? "—" : `${floor}%`;
    return `| ${label} | ${pct.toFixed(2)}% | ${metric.covered ?? 0} | ${metric.total ?? 0} | ${floorText} | ${statusFor(pct, floor)} |`;
  });

  const failed = Object.keys(thresholds).some((key) => (summary[key]?.pct ?? 0) < thresholds[key]);
  const verdict = failed ? "❌ **Below the merged ratchet** — see the failing rows above." : "✅ All metrics meet the merged floor.";

  return [
    "## Merged coverage (unit + E2E)",
    "",
    "Combined Vitest unit/functional + Playwright E2E (client + server) coverage of `src/**`.",
    "",
    "| Metric | Coverage | Covered | Total | Floor | Status |",
    "| --- | ---: | ---: | ---: | ---: | :---: |",
    ...rows,
    "",
    verdict,
    ""
  ].join("\n");
}

function writeMarkdownSummary(summary) {
  try {
    const file = path.join("coverage", "coverage-summary.md");
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, renderMarkdown(summary));
  } catch (error) {
    console.error("Failed to write coverage-summary.md", error);
  }
}

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
  // the whole repo, matching the old Vitest `include: src/**` behavior. The
  // `transformer` compiles untested TS/TSX so ALL metrics (not just lines) are
  // computed for them — keeping statements/branches/functions/lines consistent.
  all: {
    dir: ["src"],
    filter: {
      "**/*.{ts,tsx}": true,
      "**/*.d.ts": false,
      "**/*.test.{ts,tsx}": false,
      "**/__tests__/**": false,
      "**/__mocks__/**": false,
      "**/*": false
    },
    transformer: compileUntestedFile
  },

  onEnd: (coverageResults) => {
    const { summary } = coverageResults;
    writeMarkdownSummary(summary);

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
