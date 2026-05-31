import type { z } from "zod";
import { logger } from "@/lib/logger";

/**
 * Validate `data` against `schema`. On failure, log the zod issues (so real API
 * drift is visible) and throw — callers running inside react-query/SSR surface
 * this as an error state rather than rendering malformed data.
 */
export function parseOrThrow<S extends z.ZodType>(schema: S, data: unknown, context: string): z.infer<S> {
  const result = schema.safeParse(data);
  if (result.success) return result.data;
  if (process.env.NODE_ENV !== "production") {
    logger.error(`[api] Response validation failed for ${context}`, result.error.issues);
  }
  throw new Error(`Malformed response for ${context}`);
}

/**
 * Validate `data` against `schema`, returning `fallback` (and warning) on
 * failure. Use for non-critical reads where a degraded UI beats an error screen.
 */
export function parseOrFallback<S extends z.ZodType>(schema: S, data: unknown, fallback: z.infer<S>, context: string): z.infer<S> {
  const result = schema.safeParse(data);
  if (result.success) return result.data;
  if (process.env.NODE_ENV !== "production") {
    logger.warn(`[api] Response validation failed for ${context}; using fallback`, result.error.issues);
  }
  return fallback;
}
