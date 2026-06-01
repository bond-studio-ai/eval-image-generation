import { expect, test } from "@playwright/test";

/**
 * Visual regression sweep across the highest-traffic surfaces. Keep this list
 * tight — each entry adds a screenshot pair to the baseline. Update with
 * `yarn playwright test --update-snapshots` after intentional design changes.
 *
 * Each route resolves under the signed-in `storageState` configured in
 * `playwright.config.ts`. Routes that 404 or redirect to `/auth/sign-in`
 * indicate a missing storage state, not a real regression.
 */
const ROUTES = [
  { name: "analytics-strategies", path: "/" },
  { name: "analytics-products", path: "/?tab=products" },
  { name: "analytics-reliability", path: "/?tab=reliability" },
  { name: "executions-batches", path: "/executions" },
  { name: "executions-generations", path: "/executions?tab=generations" },
  { name: "audit-compare", path: "/audit/compare" },
  { name: "strategies-list", path: "/strategies" },
  { name: "input-presets", path: "/input-presets" },
  { name: "prompt-versions", path: "/prompt-versions" }
] as const;

for (const route of ROUTES) {
  test(`visual: ${route.name}`, async ({ page }) => {
    await page.goto(route.path);
    await page.waitForLoadState("load");
    // SPA routes keep background requests open, so `networkidle` never settles.
    await Promise.race([page.waitForLoadState("networkidle"), page.waitForTimeout(8000)]);
    // Hide volatile timestamps and avatars so the snapshot is stable.
    await page.addStyleTag({
      content: `
        [data-testid='timestamp'], time, .cl-userButton-root img {
          visibility: hidden !important;
        }
      `
    });
    await expect(page).toHaveScreenshot(`${route.name}.png`, {
      fullPage: true
    });
  });
}
