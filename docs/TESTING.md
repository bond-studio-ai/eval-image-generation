# Testing

All tests live under the top-level [`test/`](../test/) directory, organized by
**test type**. Tests are not colocated with source files.

## Layout

```
test/
├── setup.ts        # Vitest setup (jest-dom matchers)
├── helpers.tsx     # renderWithQuery / renderHookWithQuery (React Query wrappers)
├── unit/           # Vitest — pure functions, hooks, and component rendering
│   ├── lib/        # mirrors src/lib/
│   ├── app/        # mirrors src/app/
│   ├── hooks/      # mirrors src/hooks/
│   └── components/ # mirrors src/components/ (React component tests)
├── functional/     # Vitest — multi-module behavior, adapters, route handlers
└── e2e/            # Playwright — full-page visual + a11y against a live server
```

### `unit/` mirrors `src/`

Inside `test/unit/`, the folder structure mirrors [`src/`](../src/). A test for
`src/lib/strategy-runs-view.ts` lives at
`test/unit/lib/strategy-runs-view.test.ts`; a test for
`src/app/dollhouse-renders/new/_components/build-request.ts` lives at
`test/unit/app/dollhouse-renders/new/_components/build-request.test.ts`.

This makes it trivial to find the test for any module: take its path under
`src/`, prefix it with `test/unit/`, and append `.test`.

### Component tests (`unit/components/`)

React components are tested with [Testing Library](https://testing-library.com/)
under `test/unit/components/`, mirroring `src/components/`. Vitest's default
environment is `node` (fast for pure helpers), so each component test opts into
jsdom with a docblock on the **first line** of the file:

```tsx
// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
```

`test/setup.ts` registers the `@testing-library/jest-dom` matchers (e.g.
`toBeInTheDocument`, `toHaveClass`) for every suite. Prefer role/label queries
and assert behavior (variants, disabled/loading states, callbacks) rather than
implementation details.

Components and hooks that depend on TanStack Query (e.g. `useInfiniteList`,
`useBatchReviewStatus`) should be rendered with `renderWithQuery` /
`renderHookWithQuery` from [`test/helpers.tsx`](../test/helpers.tsx), which wrap
them in a fresh `QueryClientProvider` with retries disabled.

Keep component tests focused on prop-driven rendering and local interaction.
Components that need heavy providers (Clerk, React Query, Radix portals,
Next.js router) belong in `test/e2e` instead.

### `functional/`

Broader behavior that spans more than one module — normalization pipelines,
proxy/adapter routes, or anything that wires several helpers together (e.g.
fetch-backed service clients with a stubbed `fetch`, the catch-all proxy
handler). Mirror the `src/` structure here too when it helps, but grouping by
feature is also fine.

### `e2e/`

Playwright suites (`*.spec.ts`) that run against a live dev server. See
[`test/e2e/README.md`](../test/e2e/README.md) for auth setup and how to run them.

## Conventions

- **Naming:** Vitest files end in `.test.ts` / `.test.tsx`. Playwright files end
  in `.spec.ts`.
- **Imports:** Use the `@/` alias (`@/lib/...`, `@/app/...`) to reference source
  modules — never relative `../../src` paths.
- **Keep units pure:** Push pure derivation/normalization logic into `src/lib`
  and cover it under `test/unit`, separate from rendering.
- **No inline `eslint-disable` in tests.** If a lint rule is inappropriate for
  test code, relax it once in the `hardcore/tests` override block in
  [`eslint.config.mjs`](../eslint.config.mjs) (scoped to `TEST_FILES`) rather
  than scattering disable comments across test files. The relaxation then
  applies to every test and the reason is recorded in one place.

## Running

| Command              | What it runs                                    |
| -------------------- | ----------------------------------------------- |
| `yarn test`          | Vitest (`test/unit` + `test/functional`) once   |
| `yarn test:watch`    | Vitest in watch mode                            |
| `yarn test:coverage` | Vitest with a V8 coverage report (`coverage/`)  |
| `yarn test:e2e`      | Playwright e2e suites (`test/e2e`)              |
| `yarn coverage:all`  | Merged unit + E2E coverage report (`coverage/`) |
| `yarn verify`        | Full gate: typecheck + lint + coverage + format |

Coverage is measured against `src/**` regardless of where tests live, so the
report reflects true source coverage. The HTML report is written to
`coverage/index.html`.

## Coverage: two gates by design

Coverage runs in two modes, gated on the `COVERAGE_RAW` env var. They measure
different things on purpose — don't compare their numbers directly.

### Local tripwire — unit only (default)

`yarn test:coverage` (and therefore `yarn verify`) uses Vitest's native V8
provider and enforces the **unit-only** thresholds in `vitest.config.ts`. It is
fast (no build, no Clerk, no browser) and exists to answer "did I regress unit
coverage?". Code that is only exercised by the E2E suite shows as uncovered
here — that's expected; don't chase it locally.

### Authoritative ratchet — merged unit + E2E

The real picture combines Vitest with Playwright E2E coverage (client +
server), using [`monocart-coverage-reports`](https://github.com/cenfun/monocart-coverage-reports):

```
COVERAGE_RAW=1 vitest run            # raw V8 -> .coverage-raw/unit/raw
COVERAGE_RAW=1 playwright test ...   # raw V8 -> .coverage-raw/e2e/raw
node scripts/merge-coverage.mjs      # merge + map + filter + enforce ratchet
```

`yarn coverage:all` runs all three (clean -> unit -> e2e -> merge) and writes the
merged HTML/lcov report to `coverage/`. It needs the same setup as the E2E suite
(Clerk test-user env — see [`test/e2e/README.md`](../test/e2e/README.md)); in
coverage mode the app is served by `next dev` with `NODE_V8_COVERAGE` +
`--inspect` so both client and server V8 data have resolvable source maps.

In CI this is the `Coverage` workflow (`.github/workflows/coverage.yml`), which
is the source-of-truth gate. Like the e2e-a11y job it is skipped on fork PRs
(no Clerk secrets). The merged floor lives in `mcr.config.mjs`.

### Thresholds (ratchet)

Both gates are floored to current coverage so they can't backslide:

- **Unit-only:** `coverage.thresholds` in `vitest.config.ts`.
- **Merged:** `thresholds` in `mcr.config.mjs` (enforced by the `onEnd` hook).

When you add meaningful tests, raise the relevant floor to lock in the gain.
