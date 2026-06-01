# End-to-end harness

Two suites live here:

- [`visual.spec.ts`](visual.spec.ts) — full-page screenshots of the highest-traffic surfaces.
- [`a11y.spec.ts`](a11y.spec.ts) — axe-core WCAG 2.1 AA pass on the same surfaces.

Both run against a live dev server.

## Auth

All admin pages are Clerk-protected. Playwright cannot complete a real Clerk SSO flow inside its browser, so we reuse a signed-in session via Playwright's `storageState`.

```bash
# 1. Sign into the app in any local Chromium
yarn dev
# open http://localhost:3000, complete the Clerk flow

# 2. Capture the storage state once
mkdir -p .playwright
node -e "
  const { chromium } = require('@playwright/test');
  (async () => {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto('http://localhost:3000');
    console.log('Sign in, then press Ctrl+C in this terminal once you see /strategies render.');
    await page.waitForTimeout(10 * 60_000);
    await context.storageState({ path: '.playwright/storage.json' });
    await browser.close();
  })();
"
```

## Running

```bash
# Visual + a11y, all routes
STORAGE_STATE=.playwright/storage.json yarn test:e2e

# Update visual baselines after intentional design changes
STORAGE_STATE=.playwright/storage.json yarn test:e2e:update
```

## What's in scope

The route lists in each spec are intentionally short — only the views that drive most of the daily UX. Add new routes when a brand-new surface ships, not every detail page.
