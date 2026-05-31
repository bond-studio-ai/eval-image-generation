/** Extract an `Error.message`, falling back to a caller-supplied string for non-Error throwables. */
export function errorMessageOr(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
