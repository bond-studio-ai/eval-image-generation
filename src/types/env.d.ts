/**
 * Typed declarations for the environment variables this app reads.
 *
 * Augmenting `ProcessEnv` with named keys lets us access them as
 * `process.env.BASE_API_HOSTNAME` without tripping
 * `noPropertyAccessFromIndexSignature`, while keeping each value
 * `string | undefined` so call sites still handle absence.
 */
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      BASE_API_HOSTNAME?: string;
      AWS_S3_BUCKET?: string;
      AWS_ACCESS_KEY_ID?: string;
      AWS_SECRET_ACCESS_KEY?: string;
      AWS_S3_REGION?: string;
      NEXT_PUBLIC_ENV_LABEL?: string;
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?: string;
      CLERK_SECRET_KEY?: string;
      BASE_URL?: string;
      STORAGE_STATE?: string;
      // Playwright e2e harness (see test/e2e/ and .github/workflows/e2e-a11y.yml).
      CI?: string;
      MOCK_PORT?: string;
      E2E_CLERK_USER_USERNAME?: string;
      E2E_CLERK_USER_PASSWORD?: string;
    }
  }
}

export {};
