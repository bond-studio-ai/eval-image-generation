import { defineConfig } from '@playwright/test';

/**
 * Visual-regression and accessibility harness.
 *
 * Both suites assume the dev server is reachable at `BASE_URL` (default
 * http://localhost:3000) and that auth has been handled out-of-band — the
 * Clerk-protected admin pages will not render otherwise.
 *
 * Recommended local workflow:
 *   1. `yarn dev` in one terminal
 *   2. Sign in once in your browser to seed Clerk cookies in the storage state
 *   3. Export `STORAGE_STATE=./.playwright/storage.json` to reuse it
 *   4. `yarn playwright test`
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.01 },
  },
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
    storageState: process.env.STORAGE_STATE,
    viewport: { width: 1440, height: 900 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
});
