/**
 * Canonical key-casing helpers.
 *
 * The image-generation backend is inconsistent: most endpoints return
 * camelCase (a case-converter middleware rewrites JSONB keys on the way
 * out), but a few — analytics breakdowns, input-preset design fields, the
 * SAM prompt table — are keyed snake_case. These helpers let call sites and
 * zod schemas accept either casing without hand-writing
 * `raw.fooBar ?? raw.foo_bar` for every field.
 */

/** Convert a single snake_case token to camelCase. Digit-aware, so `foo_3d` -> `foo3d`. */
export function snakeToCamel(key: string): string {
  return key.replaceAll(/_([a-z0-9])/g, (_match, char: string) => char.toUpperCase());
}

/**
 * Recursively camelize every object key, descending into arrays and nested
 * objects. Leaf (non-object) values are returned untouched.
 */
export function camelizeDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(camelizeDeep);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, entry]) => [snakeToCamel(key), camelizeDeep(entry)]));
}

/**
 * Shallow-camelize the top-level keys of a plain object. Non-objects (and
 * arrays) are returned untouched, so free-form blob values are never
 * rewritten. When both a snake_case and camelCase key are present, the
 * existing camelCase key wins.
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
