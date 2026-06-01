# AI Image Eval Admin

A Clerk-protected Next.js admin console for evaluating AI image generation, strategy runs, prompt versions, and input presets.

This repo is a frontend/BFF. It does not own the primary database schema or Drizzle migrations; persistence and business logic live in upstream services.

## Tech Stack

- **Framework:** Next.js App Router, React, TypeScript
- **Auth:** Clerk
- **Styling:** Tailwind CSS
- **Backend access:** Next route handlers proxy image-generation, platform APIs, and S3 upload
- **Validation:** Zod and focused type guards at local boundaries
- **Tests:** Vitest for pure helpers and boundary normalization

## Quick Start

```bash
yarn
cp .env.example .env.local
yarn dev
```

Open [http://localhost:3000](http://localhost:3000).

## Required Services

- `BASE_API_HOSTNAME` points to the shared API host. The app derives:
  - image-generation v1/v2 service URLs
  - platform API URLs
- Clerk keys are required for all protected admin pages and browser-accessed API proxies.
- AWS S3 env vars are required only for image upload flows.

## Scripts

| Command             | Description                                  |
| ------------------- | -------------------------------------------- |
| `yarn dev`          | Start the development server                 |
| `yarn build`        | Build for production                         |
| `yarn start`        | Start the production server                  |
| `yarn typecheck`    | Run TypeScript without emitting files        |
| `yarn lint`         | Run ESLint                                   |
| `yarn test`         | Run Vitest tests                             |
| `yarn verify`       | Run typecheck, lint, tests, and format check |
| `yarn format`       | Format code with Prettier                    |
| `yarn format:check` | Check formatting                             |

## Project Structure

```text
src/
  app/                  Next.js routes and route handlers
  app/api/v1/           Local BFF routes and upstream service proxies
  components/           Shared UI and feature components
  hooks/                Shared client hooks
  lib/                  Service clients, proxy helpers, env helpers, parsers, utilities
  proxy.ts              Clerk route protection
docs/                   Architecture and developer workflow docs
```

## Key Patterns

- Server Components use typed server clients in `src/lib` for direct upstream reads.
- Client Components call local `/api/v1/**` routes through `serviceUrl()` or `localUrl()`.
- Browser-accessed admin proxies perform their own `auth()` checks in route handlers.
- List/table screens should prefer `DataTable`, `Pagination`, `BulkDeleteBar`, and `useInfiniteList`.
- Resource pages should use `PageHeader`, `Button`/`LinkButton` (from `@/components/ui/button`), `ResourceFormHeader`, and `ErrorCard`.

## Documentation

- [Getting Started](docs/GETTING_STARTED.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Frontend Patterns](docs/FRONTEND_PATTERNS.md)
- [API Notes](docs/API.md)
