import { test as base, expect } from "@playwright/test";
import { CoverageReport } from "monocart-coverage-reports";

import { E2E_RAW_OPTIONS, flattenSourceMap } from "./coverage-report";

/**
 * Client-side V8 coverage collection for the E2E suite.
 *
 * When `COVERAGE_RAW=1` (the merged-coverage pipeline, see `mcr.config.mjs`), an
 * auto fixture wraps every test: it starts JS coverage before the test and,
 * after it, adds the raw V8 data to a `CoverageReport`. MCR's multiprocessing
 * support collects every worker's data into `.coverage-raw/e2e/.cache`;
 * `global-teardown` later calls `generate()` once to write `.coverage-raw/e2e/raw`.
 *
 * Because we collect `raw` and merge in a separate process (the dev server is
 * gone by then), we resolve each browser entry's external source map here —
 * while the server is still up — and attach it so the merge can map minified
 * bundles back to `src/**` offline. Server-side coverage uses `file://` URLs
 * whose maps live on disk, so those resolve at merge time without help.
 *
 * We only collect JS (CSS coverage maps to stylesheets that the `src/**` filter
 * drops anyway, and its source maps add decode fragility), and we attach a
 * source map only when it's a standard, decodable map — an index map (`sections`)
 * or one without a string `mappings` would crash MCR's V8 source-map decoder.
 *
 * Coverage APIs are Chromium-only; the fixture is a no-op elsewhere and when the
 * flag is off, so normal a11y/visual runs are unaffected.
 */
const collectCoverage = Boolean(process.env.COVERAGE_RAW);

const SOURCE_MAP_URL = /\/\/[#@]\s*sourceMappingURL=(\S+)/;

interface CoverageEntry {
  url?: string;
  source?: string;
  sourceMap?: unknown;
}

export const test = base.extend<{ autoCoverage: void }>({
  autoCoverage: [
    async ({ page, browserName }, use) => {
      const enabled = collectCoverage && browserName === "chromium";

      if (enabled) {
        await page.coverage.startJSCoverage({ resetOnNavigation: false });
      }

      await use();

      if (!enabled) {
        return;
      }

      const entries = (await page.coverage.stopJSCoverage()) as CoverageEntry[];

      // Attach external source maps over HTTP while the server is still alive,
      // so the offline merge can map minified bundles back to src/**.
      for (const entry of entries) {
        if (!entry.url || !entry.source || entry.sourceMap) {
          continue;
        }
        const mapRef = SOURCE_MAP_URL.exec(entry.source)?.[1];
        if (!mapRef || mapRef.startsWith("data:")) {
          continue; // no map, or inline map (MCR reads it from the source directly)
        }
        try {
          const response = await page.request.get(new URL(mapRef, entry.url).toString());
          if (response.ok()) {
            entry.sourceMap = flattenSourceMap(JSON.parse(await response.text()));
          }
        } catch {
          // Best effort: an unresolved map just means that bundle maps less
          // precisely in the merged report; it never fails the test.
        }
      }

      await new CoverageReport(E2E_RAW_OPTIONS).add(entries);
    },
    { auto: true }
  ]
});

export { expect };
