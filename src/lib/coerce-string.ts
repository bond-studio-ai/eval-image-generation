/**
 * Coerce an unknown value to a string only when it is safely stringifiable
 * (string / number / boolean / bigint). Objects and arrays — which would
 * stringify to `"[object Object]"` or comma-joined junk — and null/undefined
 * return `undefined`, so callers can apply their own fallback via `??`.
 */
export function coerceString(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") return String(value);
  return undefined;
}
