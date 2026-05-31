/**
 * Thin logging wrapper so application code never calls `console.*` directly
 * (this keeps the `no-console` lint rule strict everywhere except here). It is
 * isomorphic — safe to import from both server and client modules — and acts as
 * the single seam for later routing logs to a backend (e.g. Datadog) without
 * touching any call sites.
 *
 * Call shape mirrors `console`: `logger.error("[scope] message", ...context)`.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

function emit(level: LogLevel, message: string, args: readonly unknown[]): void {
  // eslint-disable-next-line no-console -- the single intentional console sink
  console[level](message, ...args);
}

export const logger = {
  debug: (message: string, ...args: unknown[]): void => {
    emit("debug", message, args);
  },
  info: (message: string, ...args: unknown[]): void => {
    emit("info", message, args);
  },
  warn: (message: string, ...args: unknown[]): void => {
    emit("warn", message, args);
  },
  error: (message: string, ...args: unknown[]): void => {
    emit("error", message, args);
  }
};
