import { test } from "../fixtures";
import { gotoAndSnapshot, snapshot } from "./_helpers";

/**
 * Breadth sweep: a stable full-page screenshot of every high-value surface.
 *
 * These are page-load snapshots (no interaction) — they protect the static,
 * data-populated state of each route against unintended visual regressions.
 * Deep interaction journeys live in `flows.spec.ts`.
 *
 * Every route resolves under the signed-in `storageState` and the hermetic mock
 * backend (`test/e2e/mock-server.mjs`), which is ID-aware so detail/run pages
 * render real content. After an intentional design change, regenerate baselines
 * with `yarn test:e2e:update:docker` (Linux parity) and commit the PNGs.
 */
const ROUTES = [
  // ── Analytics dashboard (tabs) ──
  { name: "analytics-strategies", path: "/" },
  { name: "analytics-products", path: "/?tab=products" },
  { name: "analytics-reliability", path: "/?tab=reliability" },
  { name: "analytics-compare", path: "/?tab=compare" },
  // ── Runs ──
  { name: "executions-batches", path: "/executions" },
  { name: "executions-generations", path: "/executions?tab=generations" },
  { name: "audit-compare", path: "/audit/compare" },
  // ── Build: lists ──
  { name: "strategies-list", path: "/strategies" },
  { name: "input-presets", path: "/input-presets" },
  { name: "prompt-versions", path: "/prompt-versions" },
  { name: "dollhouse-renders", path: "/dollhouse-renders" },
  // ── Detail pages (charts, DAGs, image grids — highest regression risk) ──
  { name: "strategy-detail", path: "/strategies/str_1" },
  { name: "strategy-run-detail", path: "/strategies/str_1/runs/aurun_1" },
  { name: "generation-detail", path: "/generations/gen_1" },
  { name: "prompt-version-detail", path: "/prompt-versions/pv_1" },
  // ── Forms (image-generation-backed; platform-backed forms are stubbed below) ──
  { name: "strategy-new", path: "/strategies/new" },
  { name: "prompt-version-new", path: "/prompt-versions/new" },
  // ── Prompt preview ──
  { name: "prompt-preview", path: "/prompt-preview" }
] as const;

for (const route of ROUTES) {
  test(`visual: ${route.name}`, async ({ page }) => {
    await gotoAndSnapshot(page, route.path, `${route.name}.png`);
  });
}

/**
 * Input-preset detail pulls catalog products from the platform API
 * (`/api/v1/products`), which the plain-HTTP mock can't serve (platformApiBase()
 * forces https). Stub it browser-side so the product previews settle to their
 * "No preview" state deterministically instead of spinning on retries.
 */
test("visual: input-preset-detail", async ({ page }) => {
  await page.route("**/api/v1/products**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: [] }) }));
  await page.route("**/api/v1/catalog/**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: {} }) }));
  await gotoAndSnapshot(page, "/input-presets/ip_1", "input-preset-detail.png");
});

/**
 * Sign-in renders Clerk's hosted widget without the app shell. We snapshot the
 * page for layout regressions but mask the bot-protection widget, which Clerk
 * renders non-deterministically. Runs logged-out (empty storage state).
 */
test.describe("logged-out", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("visual: sign-in", async ({ page }) => {
    await page.goto("/auth/sign-in");
    await snapshot(page, "sign-in.png", {
      requireShell: false,
      mask: [page.locator("#clerk-captcha"), page.locator(".cl-captcha")]
    });
  });
});
