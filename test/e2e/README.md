# End-to-end harness

Two suites live here, split into Playwright projects:

- [`a11y.spec.ts`](a11y.spec.ts) (`--project=a11y`) — axe-core WCAG 2.1 AA pass on the highest-traffic surfaces. **Runs in CI** ([`.github/workflows/e2e-a11y.yml`](../../.github/workflows/e2e-a11y.yml)).
- [`visual.spec.ts`](visual.spec.ts) (`--project=visual`) — full-page screenshots. Local-only for now: it has no committed baselines yet, so it is **excluded from the default `yarn test:e2e`** (which runs only `a11y`). Run it explicitly with `yarn test:e2e:visual` after generating baselines via `yarn test:e2e:update`. It needs Linux-generated baselines before it can run in CI.

## How it works

Unlike the old manual flow, auth and the backend are now wired up automatically:

- **Auth** — [`global-setup.ts`](global-setup.ts) signs in a real Clerk test user via [`@clerk/testing`](https://clerk.com/docs/testing/playwright/overview) and saves the session to `STORAGE_STATE` (default `.playwright/storage.json`). Every spec starts logged in.
- **Backend** — [`mock-server.mjs`](mock-server.mjs) is a hermetic stand-in for the image-generation service. `playwright.config.ts` points `BASE_API_HOSTNAME` at it, so both SSR (`service-client`) and `/api/v1` proxy fetches resolve to the mock. Pages render their empty states — enough for the a11y sweep.
- **Servers** — `playwright.config.ts`'s `webServer` starts the mock and `next start` for you (after a `yarn build`). Outside CI, `reuseExistingServer` leaves any running `yarn dev` alone.

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
yarn test:e2e          # == yarn test:e2e:a11y until visual baselines exist
yarn test:e2e:a11y

# Visual project (local only): generate baselines first, then run it
yarn test:e2e:update   # writes visual.spec.ts-snapshots/ baselines
yarn test:e2e:visual
```

`STORAGE_STATE`, `BASE_URL`, and `MOCK_PORT` can be overridden via env if you need to target a different setup.

## What's in scope

The route lists in each spec are intentionally short — only the views that drive most of the daily UX. Add new routes when a brand-new surface ships, not every detail page.
