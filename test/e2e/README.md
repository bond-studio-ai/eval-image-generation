# End-to-end harness

Two suites live here, split into Playwright projects:

- [`a11y.spec.ts`](a11y.spec.ts) (`--project=a11y`) — axe-core WCAG 2.1 AA pass on the highest-traffic surfaces. **Runs in CI** ([`.github/workflows/e2e-a11y.yml`](../../.github/workflows/e2e-a11y.yml)).
- [`visual/`](visual) (`--project=visual`) — screenshot regression. **Runs in CI** ([`.github/workflows/e2e-visual.yml`](../../.github/workflows/e2e-visual.yml)) once Linux baselines are committed. Split into:
  - [`visual/routes.spec.ts`](visual/routes.spec.ts) — a breadth sweep of full-page snapshots across every high-value route (dashboards, lists, detail pages, forms).
  - [`visual/flows.spec.ts`](visual/flows.spec.ts) — depth: interaction-driven journeys (expand a batch → matrix view, two-run audit compare, apply a generations filter, expand the strategy builder) snapshotted at their meaningful end state.
  - [`visual/_helpers.ts`](visual/_helpers.ts) — the shared `snapshot()` / `gotoAndSnapshot()` harness: it waits for the populated state (no skeletons/spinners), disables animations/transitions, and hides volatile chrome (timestamps, avatar, env badge) so screenshots are byte-stable.

## How it works

Unlike the old manual flow, auth and the backend are now wired up automatically:

- **Auth** — [`global-setup.ts`](global-setup.ts) signs in a real Clerk test user via [`@clerk/testing`](https://clerk.com/docs/testing/playwright/overview) and saves the session to `STORAGE_STATE` (default `.playwright/storage.json`). Every spec starts logged in.
- **Backend** — [`mock-server.mjs`](mock-server.mjs) is a hermetic stand-in for the image-generation service. `playwright.config.ts` points `BASE_API_HOSTNAME` at it, so both SSR (`service-client`) and `/api/v1` proxy fetches resolve to the mock. Routing is **ID-aware**: list paths return a paginated envelope while single-resource paths (`/strategies/str_1`), sub-resources (`/strategies/str_1/runs`), and detail endpoints (`/strategy-runs/{id}`, `/generations/{id}`) return the single objects the detail/run pages expect — so the visual sweep exercises populated, data-rich UI.
- **Determinism** — fixtures anchor timestamps to a fixed base date (not `Date.now()`), and `playwright.config.ts` pins `TZ`/`timezoneId`/`locale` to UTC/en-US, so every rendered date is stable (including plain-text `toLocaleString()` output no CSS can hide).
- **Servers** — `playwright.config.ts`'s `webServer` starts the mock and `next start` for you (after a `yarn build`). Outside CI, `reuseExistingServer` leaves any running `yarn dev` alone.

> **Platform-API caveat:** `platformApiBase()` ([`src/lib/env.ts`](../../src/lib/env.ts)) forces `https://`, so the plain-HTTP mock can't serve platform endpoints (design packages, layout presets, products). Surfaces that need them (e.g. input-preset detail/forms) stub the **browser-side** calls with `page.route('**/api/v1/products**', …)` inside the spec. Server-component platform fetches can't be intercepted — keep those surfaces out of the visual suite or rely on their tolerant empty states.

## Required environment

These power `global-setup`'s sign-in and the app under test. In CI they are GitHub repository **secrets** (see the workflow); locally put them in `.env.local` or export them.

| Var                                 | Purpose                                                                                |
| ----------------------------------- | -------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk **development/test** instance publishable key                                    |
| `CLERK_SECRET_KEY`                  | Clerk test instance secret key (mints the testing token; must not be a production key) |
| `E2E_CLERK_USER_USERNAME`           | Identifier (email/username) of a password-based test user in that instance             |
| `E2E_CLERK_USER_PASSWORD`           | That test user's password                                                              |

> One-time setup (manual): create a dedicated Clerk **test** instance, add a password-based user (a `+clerk_test` email is recommended), then add the four values above as GitHub Actions secrets on the repo.

## Running

```bash
# Build once, then run the default e2e suite (a11y only — Playwright starts the servers)
yarn build
yarn test:e2e          # == yarn test:e2e:a11y
yarn test:e2e:a11y
```

### Visual regression

Screenshots must be byte-identical to CI's Linux rendering, so **baselines are always generated in the official Playwright Docker container** — never commit a macOS/Windows baseline (font hinting differs and it will diff forever).

```bash
# (Re)generate + commit baselines after an intentional design change:
yarn test:e2e:update:docker     # writes test/e2e/visual/*.spec.ts-snapshots/ then commit the PNGs

# Verify against committed baselines, exactly as CI does:
yarn test:e2e:visual:docker

# Quick local iteration WITHOUT Linux parity (will diff vs. committed baselines — don't commit these):
yarn test:e2e:visual
yarn test:e2e:update
```

Both `:docker` scripts run [`scripts/visual-baselines.sh`](visual-baselines.sh) — it needs Docker and the four Clerk vars in `.env.local`.

**Reviewing a failed visual check:** download the `playwright-visual-report` artifact from the CI run — `test-results/` contains `*-expected.png`, `*-actual.png`, and `*-diff.png` for every failure. If the change is intentional, run `yarn test:e2e:update:docker` and commit the new baselines in the same PR.

`STORAGE_STATE`, `BASE_URL`, and `MOCK_PORT` can be overridden via env if you need to target a different setup.

## What's in scope

The a11y route list is intentionally short — only the views that drive most of the daily UX.

The visual suite is broader by design (it's our regression net), but keep it deliberate:

- **Adding a route** to the breadth sweep: append `{ name, path }` to the `ROUTES` array in [`visual/routes.spec.ts`](visual/routes.spec.ts). If the page reads a resource by id, make sure [`mock-server.mjs`](mock-server.mjs) returns a single object for that path. If it hits a platform API, stub it browser-side (see the caveat above).
- **Adding a flow** to the depth sweep: add a `test()` to [`visual/flows.spec.ts`](visual/flows.spec.ts), drive the UI with accessible roles/names, then call `snapshot(page, "flow-….png")` at the end state.
- After adding either, regenerate baselines with `yarn test:e2e:update:docker` and commit the new PNGs.
