/**
 * Returns a shallow copy of `obj` with every `undefined`-valued key removed.
 *
 * Under `exactOptionalPropertyTypes`, you can't pass `{ foo: maybeUndefined }`
 * to a target whose property is `foo?: T` — the explicit `undefined` is
 * rejected. Spreading `definedProps({ foo })` instead omits the key entirely
 * when it's `undefined`, which is exactly what the optional property expects.
 *
 * The returned type keeps each key optional with `undefined` excluded, so the
 * result is safe to spread into props/params that declare the field optional.
 */
export function definedProps<T extends object>(obj: T): { [K in keyof T]?: Exclude<T[K], undefined> } {
  const out: { [K in keyof T]?: Exclude<T[K], undefined> } = {};
  for (const key of Object.keys(obj) as (keyof T)[]) {
    const value = obj[key];
    if (value !== undefined) {
      out[key] = value as Exclude<T[typeof key], undefined>;
    }
  }
  return out;
}
