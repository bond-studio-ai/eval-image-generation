# Getting Started

## Prerequisites

- Node.js 20 or newer
- Yarn
- Access to Clerk keys for the admin app
- Access to the image-generation service host
- Optional: catalog-feed admin service credentials and AWS S3 upload credentials

## Local Setup

```bash
yarn
cp .env.example .env.local
yarn dev
```

The app runs at [http://localhost:3000](http://localhost:3000).

## Environment Variables

```bash
# Shared API host. image-generation routes derive /image-generation/v1 and /v2 from this.
BASE_API_HOSTNAME=http://localhost:3001

# Clerk Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Optional catalog-feed admin API override/token
CATALOG_FEED_BASE_HOSTNAME=http://localhost:3002
CATALOG_FEED_ADMIN_TOKEN=...

# Optional S3 upload support
AWS_S3_BUCKET=your-bucket-name
AWS_S3_REGION=us-west-2
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
```

## Verification

Run the full local quality gate before opening a PR:

```bash
yarn verify
```

For narrower loops:

```bash
yarn typecheck
yarn lint
yarn test
yarn format:check
```

## How Data Flows

- Pages and Server Components read directly from upstream services through server-only clients in `src/lib`.
- Client Components call local route handlers under `/api/v1/**`.
- `/api/v1/image-generation/**` proxies browser requests to the image-generation service after Clerk auth.
- `/api/v1/catalog-feed/**` proxies browser requests to catalog-feed after Clerk auth and injects the server-side admin token when configured.
- Local routes such as upload/products/projects act as small BFF adapters for platform APIs or S3.

## Development Workflow

1. Use existing shared UI primitives before creating new styling or table/form patterns.
2. Put server-only env access in `src/lib/env.ts`.
3. Keep proxy behavior in `src/lib/proxy-handler.ts` so upstream errors are surfaced consistently.
4. Add tests around pure parsers, normalizers, and feature-state helpers before refactoring larger UI files.
5. Use Yarn for all package and script commands.

## Troubleshooting

- If a proxied browser request returns `401`, sign in through Clerk and confirm `src/proxy.ts` is running for `/api/**`.
- If upstream calls return `502`, check `BASE_API_HOSTNAME`, `CATALOG_FEED_BASE_HOSTNAME`, and the service logs.
- If upload fails with an internal config error, verify all required AWS env vars are present.
- If a page renders no data locally, confirm the corresponding upstream service has reachable seed data.
