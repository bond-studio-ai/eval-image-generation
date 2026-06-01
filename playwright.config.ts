import { defineConfig, devices, type ReporterDescription } from "@playwright/test";
import dotenv from "dotenv";

// Load local secrets (Clerk keys, E2E user creds) for the Playwright process so
// `globalSetup` can authenticate. Next.js loads `.env.local` for the app on its
// own; this only affects the test runner. Absent in CI, where the job provides
// these via real environment variables — that's fine, dotenv is a no-op then.
dotenv.config({ path: ".env.local", quiet: true });

/**
 * Visual-regression and accessibility harness.
 *
 * CI (`.github/workflows/e2e-a11y.yml`) runs the `a11y` project fully self-
 * contained: `globalSetup` signs in a real Clerk test user and saves the
 * session to `STORAGE_STATE`, while a mock upstream (`test/e2e/mock-server.mjs`)
 * stands in for the image-generation backend via `BASE_API_HOSTNAME`. Both the
 * mock and the Next server are started by `webServer` below.
 *
 * Local workflow:
 *   - Provide Clerk + test-user env (see `test/e2e/README.md`).
 *   - `yarn build` once, then `yarn test:e2e:a11y` (Playwright starts the
 *     servers for you). Or run your own `yarn dev` — `reuseExistingServer`
 *     leaves it alone outside CI.
 *
 * Coverage workflow (`COVERAGE_RAW=1`, driven by `yarn coverage:all`):
 *   - Runs against a production `next start` build (so it needs a prior
 *     `yarn build` with COVERAGE_RAW set, which turns on client + server source
 *     maps — see next.config.ts). The server is started with `NODE_V8_COVERAGE`
 *     + `--inspect` so both client (page.coverage) and server (CDP flush in
 *     `global-teardown`) V8 coverage can be captured, mapped to `src/**`, and
 *     merged with the unit coverage. Production maps are standard external maps
 *     that MCR can decode (unlike Next's dev/section maps).
 */
const isCI = Boolean(process.env.CI);
const collectCoverage = Boolean(process.env.COVERAGE_RAW);

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const MOCK_PORT = process.env.MOCK_PORT ?? "3001";
const STORAGE_STATE = process.env.STORAGE_STATE ?? ".playwright/storage.json";
const INSPECT_PORT = process.env.COVERAGE_INSPECT_PORT ?? "9229";

// Coverage collection happens via the fixtures + global-teardown (MCR API), not
// a reporter, so reporting is just the list reporter in coverage mode and is
// otherwise unchanged.
const defaultReporter: ReporterDescription[] = isCI ? [["list"], ["html", { open: "never" }]] : [["list"]];
const reporter: ReporterDescription[] = collectCoverage ? [["list"]] : defaultReporter;

// Coverage needs our own freshly-instrumented dev server, so don't piggy-back on
// a developer's already-running server in that mode.
const reuseExistingServer = !isCI && !collectCoverage;

const appServer = collectCoverage
  ? {
      // Invoke the Next CLI directly (not via `yarn start`): with `yarn`, Yarn is
      // the Node process that consumes NODE_OPTIONS=--inspect and binds the
      // inspector port, so the Next child can't open its own CDP endpoint and
      // global-teardown can't flush server coverage. Running `node .../next start`
      // attaches the inspector to the Next server process itself; global-teardown
      // connects to INSPECT_PORT (or its forked worker at INSPECT_PORT + 1).
      // Requires a prior `yarn build` with COVERAGE_RAW set (see next.config.ts).
      command: `cross-env NODE_V8_COVERAGE=.v8-coverage NODE_OPTIONS=--inspect=${INSPECT_PORT} node node_modules/next/dist/bin/next start`,
      url: BASE_URL,
      timeout: 120_000,
      reuseExistingServer,
      env: { BASE_API_HOSTNAME: `http://localhost:${MOCK_PORT}`, COVERAGE_RAW: "1" }
    }
  : {
      command: "yarn start",
      url: BASE_URL,
      timeout: 120_000,
      reuseExistingServer,
      // Force the app at the hermetic mock backend. Clerk keys are inherited
      // from the environment (CI job env, or `.env.local` loaded above / by
      // Next at runtime) — never injected as empty strings, which would clobber
      // a valid `.env.local` value on local runs.
      env: { BASE_API_HOSTNAME: `http://localhost:${MOCK_PORT}` }
    };

export default defineConfig({
  testDir: "./test/e2e",
  timeout: 60_000,
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.01 }
  },
  fullyParallel: true,
  retries: isCI ? 1 : 0,
  reporter,
  globalSetup: "./test/e2e/global-setup.ts",
  globalTeardown: "./test/e2e/global-teardown.ts",
  use: {
    baseURL: BASE_URL,
    storageState: STORAGE_STATE,
    viewport: { width: 1440, height: 900 },
    screenshot: "only-on-failure",
    trace: "retain-on-failure"
  },
  projects: [
    {
      name: "a11y",
      testMatch: /a11y\.spec\.ts$/,
      use: { ...devices["Desktop Chrome"] }
    },
    {
      name: "visual",
      testMatch: /visual\.spec\.ts$/,
      use: { ...devices["Desktop Chrome"] }
    }
  ],
  webServer: [
    {
      command: "node test/e2e/mock-server.mjs",
      port: Number(MOCK_PORT),
      reuseExistingServer,
      env: { MOCK_PORT }
    },
    appServer
  ]
});
