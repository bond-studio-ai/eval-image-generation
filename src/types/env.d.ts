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
      BASE_URL?: string;
      STORAGE_STATE?: string;
    }
  }
}

export {};
