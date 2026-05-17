# Agent Instructions

- Use Yarn for all package-management and script commands. Do not use `npm`.

## Cursor Cloud specific instructions

### Services overview

- **eval-image-generation** — Next.js 16 frontend on port 3000 (Turbopack dev server). Acts as admin dashboard for the image generation backend.
- **Depends on**: `service-image-generation` backend (port 4000) for all data.

### Starting the dev environment

1. Start the backend service first (see `/agent/repos/service-image-generation/AGENTS.md`).
2. `yarn dev` — starts Next.js dev server on port 3000.

### Non-obvious notes

- **Clerk auth required** — `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` must be valid Clerk keys for the app to render pages. With placeholder keys, `yarn dev` starts but pages return 500.
- **`yarn build` also needs real Clerk keys** — static generation fails at build time if the key format is invalid.
- **`yarn lint` uses `next lint`** which was removed in Next.js 16 — ESLint must be invoked directly via `npx eslint .` if needed. The flat config requires `@typescript-eslint` to be exposed (pre-existing issue).
- **`BASE_API_HOSTNAME`** in `.env.local` should point to the running backend, e.g. `http://localhost:4000`.
