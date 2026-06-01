#!/usr/bin/env bash
set -euo pipefail

# Run the visual-regression suite inside the official Playwright Linux container
# so the screenshots match what CI renders. Font hinting and anti-aliasing are
# OS-specific, so baselines generated on macOS/Windows would diff against CI
# forever — this is the supported way to produce/verify them locally.
#
# Usage:
#   yarn test:e2e:update:docker     # (re)generate + commit baselines
#   yarn test:e2e:visual:docker     # run the suite against committed baselines
#
# Set E2E_TARGET to pick the yarn script run inside the container
# (defaults to test:e2e:update). Requires Docker and Clerk test creds in
# .env.local: NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY,
# E2E_CLERK_USER_USERNAME, E2E_CLERK_USER_PASSWORD.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT}"

# Pin the container image to the *installed* Playwright version (fall back to the
# package.json range) so the bundled browser matches the test runner exactly.
PLAYWRIGHT_VERSION="$(node -p "require('@playwright/test/package.json').version" 2>/dev/null || node -p "require('./package.json').devDependencies['@playwright/test'].replace(/[^0-9.]/g,'')")"
IMAGE="mcr.microsoft.com/playwright:v${PLAYWRIGHT_VERSION}-jammy"
TARGET="${E2E_TARGET:-test:e2e:update}"

if [[ ! -f "${ROOT}/.env.local" ]]; then
  echo "error: .env.local not found. Clerk test creds are required for global-setup to sign in." >&2
  exit 1
fi

echo "→ Playwright image: ${IMAGE}"
echo "→ Running: yarn ${TARGET}"

# node_modules hold platform-specific binaries (esbuild, etc.), so we install
# fresh inside the container rather than mounting the host's macOS build.
docker run --rm \
  -v "${ROOT}:/work" \
  -w /work \
  -e CI=1 \
  -e E2E_TARGET="${TARGET}" \
  "${IMAGE}" \
  bash -lc 'corepack enable && yarn install --frozen-lockfile && yarn build && yarn "${E2E_TARGET}"'
