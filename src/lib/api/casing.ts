/**
 * Key-casing helpers for normalizing loosely-typed backend payloads.
 *
 * The image-generation backend is inconsistent: most endpoints return camelCase,
 * but a few (notably analytics breakdowns and input-preset design fields) mix in
 * snake_case keys. These helpers let a zod schema accept either casing without
 * the call site hand-writing `raw.fooBar ?? raw.foo_bar` for every field.
 */

function snakeToCamel(key: string): string {
  return key.replaceAll(/_([a-z0-9])/g, (_match, char: string) => char.toUpperCase());
}

/**
 * Shallow-camelize the top-level keys of a plain object. Non-objects (and arrays)
 * are returned untouched, so free-form blob values are never rewritten. When both
 * a snake_case and camelCase key are present, the existing camelCase key wins.
 */
export function camelizeKeys(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const out: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    const camel = snakeToCamel(key);
    if (camel in out && key !== camel) continue;
    out[camel] = entry;
  }
  return out;
}
