import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Coverage runs in one of two modes:
//   - default: native V8 provider + thresholds. This is the fast LOCAL tripwire
//     used by `yarn test:coverage` / `yarn verify` — "did I regress unit
//     coverage?". The numbers below are the UNIT-ONLY floor.
//   - COVERAGE_RAW=1: emit raw V8 data via the monocart custom provider into the
//     shared raw cache so it can be merged with Playwright E2E coverage. No
//     thresholds here — the merged report (mcr.config.mjs) owns the real ratchet.
// The two modes are mutually exclusive: a custom provider disables Vitest's
// native threshold enforcement, so we can't both raw-emit and gate in one run.
const emitRaw = Boolean(process.env.COVERAGE_RAW);

const include = ["src/**/*.{ts,tsx}"];
const exclude = ["src/**/*.test.{ts,tsx}", "src/**/*.d.ts", "src/**/__tests__/**", "src/**/__mocks__/**"];

const coverage = emitRaw
  ? {
      enabled: true,
      provider: "custom" as const,
      customProviderModule: "vitest-monocart-coverage",
      include,
      exclude,
      // Raw V8 data only; merged + filtered + gated later by merge-coverage.mjs.
      coverageReportOptions: {
        name: "Unit Coverage (raw)",
        outputDir: ".coverage-raw/unit",
        reports: [["raw", { outputDir: "raw" }]],
        cleanCache: true
      }
    }
  : {
      provider: "v8" as const,
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "coverage",
      include,
      exclude,
      // Ratchet: floored to the current achieved UNIT-ONLY coverage so it can't
      // backslide locally. The merged (unit + E2E) ratchet lives in
      // mcr.config.mjs and is enforced in CI. Raise these as unit coverage grows.
      thresholds: {
        statements: 35,
        branches: 28,
        functions: 27,
        lines: 35
      }
    };

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./test/setup.ts"],
    include: ["test/unit/**/*.test.{ts,tsx}", "test/functional/**/*.test.{ts,tsx}"],
    coverage
  },
  resolve: {
    alias: {
      "@": new URL("src", import.meta.url).pathname
    }
  }
});
