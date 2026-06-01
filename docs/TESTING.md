# Testing

All tests live under the top-level [`test/`](../test/) directory, organized by
**test type**. Tests are not colocated with source files.

## Layout

```
test/
├── unit/          # Vitest — pure, isolated functions (no I/O, no network)
│   ├── lib/       # mirrors src/lib/
│   └── app/       # mirrors src/app/
├── functional/    # Vitest — multi-module behavior, adapters, route handlers
└── e2e/           # Playwright — full-page visual + a11y against a live server
```

### `unit/` mirrors `src/`

Inside `test/unit/`, the folder structure mirrors [`src/`](../src/). A test for
`src/lib/strategy-runs-view.ts` lives at
`test/unit/lib/strategy-runs-view.test.ts`; a test for
`src/app/dollhouse-renders/new/_components/build-request.ts` lives at
`test/unit/app/dollhouse-renders/new/_components/build-request.test.ts`.

This makes it trivial to find the test for any module: take its path under
`src/`, prefix it with `test/unit/`, and append `.test`.

### `functional/`

Broader behavior that spans more than one module — normalization pipelines,
proxy/adapter routes, or anything that wires several helpers together. Mirror the
`src/` structure here too when it helps, but grouping by feature is also fine.

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

## Running

| Command | What it runs |
| --------------------- | ------------------------------------------------- |
| `yarn test` | Vitest (`test/unit` + `test/functional`) once |
| `yarn test:watch` | Vitest in watch mode |
| `yarn test:coverage` | Vitest with a V8 coverage report (`coverage/`) |
| `yarn test:e2e` | Playwright e2e suites (`test/e2e`) |
| `yarn verify` | Full gate: typecheck + lint + coverage + format |

Coverage is measured against `src/**` regardless of where tests live, so the
report reflects true source coverage. The HTML report is written to
`coverage/index.html`.
