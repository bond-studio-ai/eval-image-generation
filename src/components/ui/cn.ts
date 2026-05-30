import { extendTailwindMerge } from 'tailwind-merge';

/**
 * Our custom design tokens (defined in `@theme` in globals.css) aren't part of
 * tailwind-merge's built-in scales, so without registering them it can't tell
 * that e.g. `rounded-card` and `rounded-xl` target the same property and would
 * keep both. Teaching it our token names makes consumer overrides of these
 * tokens collapse cleanly, just like the standard utilities.
 */
const SCALE = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900'];

const customColors = [
  // Semantic surface / text / border tokens.
  'bg-app',
  'surface',
  'surface-muted',
  'surface-sunken',
  'border',
  'border-strong',
  'border-subtle',
  'text-primary',
  'text-secondary',
  'text-muted',
  'text-disabled',
  'text-inverse',
  // Brand + signal palettes.
  ...['primary', 'success', 'warning', 'danger', 'info', 'accent'].flatMap((name) =>
    SCALE.map((step) => `${name}-${step}`),
  ),
  // primary additionally defines a 950 step.
  'primary-950',
];

const twMergeWithTokens = extendTailwindMerge({
  extend: {
    theme: {
      color: customColors,
      radius: ['card', 'button', 'input', 'pill'],
      shadow: ['card', 'card-hover', 'popover', 'modal', 'focus'],
      // Font-size ramp (text-{name}); distinct from text-color names above.
      text: ['caption', 'body', 'body-lg', 'h3', 'h2', 'display', 'display-lg'],
    },
  },
});

/**
 * Class-name joiner with Tailwind conflict resolution. Accepts strings, falsy
 * values (skipped), and arrays. Useful inside primitives that compose
 * conditional Tailwind classes and expose a `className` override prop.
 *
 * Order matters: when two classes target the same property (e.g. a primitive's
 * default `max-w-md` and a caller's `max-w-4xl`), the later one wins. Callers
 * pass overrides last, so consumer `className` reliably beats primitive
 * defaults. Plain CSS can't guarantee this — the cascade is decided by
 * stylesheet order, not class-attribute order — so we lean on `tailwind-merge`
 * instead of authoring order.
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
  return twMergeWithTokens(out.join(' '));
}
