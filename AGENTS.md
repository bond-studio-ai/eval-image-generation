# AGENTS.md

Orientation for AI agents and new contributors working in this repo. Read this
first, then the linked docs for anything you're about to touch.

## What this is

A Clerk-protected Next.js (App Router) admin console for evaluating AI image
generation — strategy runs, prompt versions, input presets, analytics. It is a
**frontend / BFF**: it owns the UI, the auth boundary, and thin proxy/adapter
routes, but **not** the primary database or upstream business logic.

## Commands (Yarn only — never npm)

| Command          | Purpose                                      |
| ---------------- | -------------------------------------------- |
| `yarn dev`       | Dev server (http://localhost:3000)           |
| `yarn verify`    | Full gate: typecheck + lint + tests + format |
| `yarn typecheck` | `tsc --noEmit`                               |
| `yarn lint`      | ESLint                                       |
| `yarn test`      | Vitest                                       |
| `yarn format`    | Prettier write                               |

Run `yarn verify` before opening a PR.

## Where the docs live

| Doc                                                    | Read it when…                                                         |
| ------------------------------------------------------ | --------------------------------------------------------------------- |
| [README.md](README.md)                                 | You need the high-level overview, tech stack, and project structure.  |
| [docs/GETTING_STARTED.md](docs/GETTING_STARTED.md)     | Setting up locally, env vars, data flow, troubleshooting.             |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)           | Understanding runtime boundaries, auth, server vs client data access. |
| [docs/FRONTEND_PATTERNS.md](docs/FRONTEND_PATTERNS.md) | Building UI — layout, primitives, forms, tables, feedback.            |
| [docs/TESTING.md](docs/TESTING.md)                     | Where tests live, the `test/` layout by type, and how to run them.    |
| [docs/DESIGN_TOKENS.md](docs/DESIGN_TOKENS.md)         | Choosing colors, type, spacing, shadows (the token system).           |
| [docs/LIBRARIES.md](docs/LIBRARIES.md)                 | Adding a dependency or deciding whether to hand-roll something.       |
| [docs/API.md](docs/API.md)                             | Historical reference for the upstream image-generation API shapes.    |

## Conventions

The canonical, machine-applied conventions live as rule files in
[`.cursor/rules/`](.cursor/rules/). Cursor loads them automatically. **If you are
an agent running outside Cursor (Claude Code, Codex, CI bots, etc.), these still
apply — open and follow the matching `.cursor/rules/*.mdc` file (they are plain
markdown).** The table below summarizes each rule so this file stays a complete,
standalone reference; the linked `.mdc` is the source of truth for the details.

| Rule                                                 | Applies to        | In short                                                                                                                                                                                                                                                                            |
| ---------------------------------------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`use-yarn`](.cursor/rules/use-yarn.mdc)             | everything        | Yarn for all package/script commands; never `npm`.                                                                                                                                                                                                                                  |
| [`ui-conventions`](.cursor/rules/ui-conventions.mdc) | `src/**` UI       | Use semantic tokens + `src/components/ui/` primitives (`Button`, `Badge`, `Card`, `DataTable`, …); raw Tailwind palette colors and bare font sizes are lint errors. Detail: [docs/DESIGN_TOKENS.md](docs/DESIGN_TOKENS.md), [docs/FRONTEND_PATTERNS.md](docs/FRONTEND_PATTERNS.md). |
| [`page-headers`](.cursor/rules/page-headers.mdc)     | pages             | Every page title goes through `<PageHeader>`; never a raw `<h1>`.                                                                                                                                                                                                                   |
| [`resource-forms`](.cursor/rules/resource-forms.mdc) | create/edit forms | `<ResourceFormHeader>` + `<FormSection>` + `<ErrorCard>` structure; separate routes for create/edit.                                                                                                                                                                                |
| [`data-table`](.cursor/rules/data-table.mdc)         | list/table views  | Use `<DataTable>` + `useInfiniteList`; never raw `<table>` or client-side filtering.                                                                                                                                                                                                |
| [`env-config`](.cursor/rules/env-config.mdc)         | server code       | Read backend hosts via `@/lib/env` helpers; never `process.env.*` directly. Server-only — never import in client components.                                                                                                                                                        |
| [`testing`](.cursor/rules/testing.mdc)               | `test/**`         | Tests live in `test/` by type (`unit` mirrors `src/`); no inline `eslint-disable` in tests — relax test-inappropriate rules in `eslint.config.mjs` › `hardcore/tests` instead. Detail: [docs/TESTING.md](docs/TESTING.md).                                                          |

Lint/format/type rules are enforced by `yarn verify`; the ESLint config
([eslint.config.mjs](eslint.config.mjs)) is the source of truth for severity and
for test-scoped relaxations (the `hardcore/tests` block).

## Guiding principles

- **Prefer established libraries over hand-rolling.** This is a deliberate,
  documented stance — see [docs/LIBRARIES.md](docs/LIBRARIES.md) for the policy,
  the current stack, and the explicitly-recorded exceptions. If you hand-roll or
  defer adopting a library on purpose, add the reason there.
- **Keep the server/client boundary clean.** Server Components use typed clients
  in `src/lib`; Client Components call local `/api/v1/**` routes via `serviceUrl()`
  / `localUrl()` and must never import server-only env helpers.
- **Push logic into testable helpers.** Pure normalization/derivation belongs in
  `src/lib` with Vitest coverage, separate from rendering.
- **Surface failures.** Use `toast.error()` / `ErrorCard`; never silently swallow
  a failed mutation.
- **React diagnostics:** run `yarn doctor` (react-doctor); confirmed false
  positives are tracked in [`.react-doctor/false-positives.md`](.react-doctor/false-positives.md).
