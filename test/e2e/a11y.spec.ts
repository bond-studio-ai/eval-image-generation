import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * Axe accessibility pass over the most-trafficked screens. Same auth caveats
 * as the visual suite — routes need a signed-in storage state.
 *
 * We exclude `cl-userButton` (Clerk-hosted) from the audit since we don't own
 * those nodes. Add other excludes here if you need to silence checks on
 * embedded third-party widgets.
 */
const ROUTES = ["/", "/executions", "/executions?tab=generations", "/audit/compare", "/strategies", "/input-presets", "/prompt-versions"];

for (const path of ROUTES) {
  test(`a11y: ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("load");
    // Some routes (e.g. /audit/compare) are SPAs that keep background requests
    // open, so `networkidle` never settles. Cap the wait so the scan still runs.
    await Promise.race([page.waitForLoadState("networkidle"), page.waitForTimeout(8000)]);
    const results = await new AxeBuilder({ page }).exclude(".cl-userButton-root").withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(results.violations, results.violations.map((v) => `${v.id}: ${v.help}`).join("\n")).toEqual([]);
  });
}
