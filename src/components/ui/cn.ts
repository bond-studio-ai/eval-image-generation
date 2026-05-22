/**
 * Tiny class-name joiner. Accepts strings, falsy values (skipped), and arrays.
 * Useful inside primitives that compose conditional Tailwind classes.
 *
 * For full Tailwind merge resolution we'd reach for `tailwind-merge`, but the
 * footprint isn't worth it here — primitives author classes carefully and rely
 * on order/specificity instead.
 */
export type ClassValue = string | false | null | undefined | ClassValue[];

export function cn(...values: ClassValue[]): string {
  const out: string[] = [];
  const walk = (value: ClassValue) => {
    if (!value) return;
    if (typeof value === 'string') {
      out.push(value);
      return;
    }
    for (const item of value) walk(item);
  };
  walk(values);
  return out.join(' ');
}
