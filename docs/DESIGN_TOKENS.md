# Design Tokens

All design tokens live in [src/app/globals.css](../src/app/globals.css) inside a single `@theme` block. Tailwind v4 turns each token into a utility class automatically, so consumers never read CSS variables directly — they use Tailwind classes that are generated from the tokens.

## Color

### Primary (brand)

| Token                      | Class                                      | Use                                       |
| -------------------------- | ------------------------------------------ | ----------------------------------------- |
| `--color-primary-{50–950}` | `bg-primary-600`, `text-primary-700`, etc. | Brand actions, focused inputs, active nav |

### Signal scales

Use these for status, severity, and informational pills.

| Scale     | Use                                          |
| --------- | -------------------------------------------- |
| `success` | Healthy / completed / active                 |
| `warning` | Attention / partial / retry                  |
| `danger`  | Failure / destructive                        |
| `info`    | Neutral information (alias of brand blue)    |
| `accent`  | Differentiating tags (multi-strategy, judge) |

Example: `bg-success-50 text-success-700 ring-1 ring-success-600/20`.

### Semantic surface, text, border

Prefer these for chrome over raw `gray-*`. They isolate the dark-mode surface so only `globals.css` needs to change later.

| Token                    | Class                  | Use                                  |
| ------------------------ | ---------------------- | ------------------------------------ |
| `--color-bg-app`         | `bg-bg-app`            | Page background                      |
| `--color-surface`        | `bg-surface`           | Cards, popovers, table rows          |
| `--color-surface-muted`  | `bg-surface-muted`     | Toolbars, table headers              |
| `--color-surface-sunken` | `bg-surface-sunken`    | Inset wells, segmented control track |
| `--color-border`         | `border-border`        | Default 1px borders                  |
| `--color-border-strong`  | `border-border-strong` | Inputs, dividers under emphasis      |
| `--color-border-subtle`  | `border-border-subtle` | Inner hairlines                      |
| `--color-text-primary`   | `text-text-primary`    | Body, labels, titles                 |
| `--color-text-secondary` | `text-text-secondary`  | Subtitles, helper text               |
| `--color-text-muted`     | `text-text-muted`      | Less important metadata              |
| `--color-text-disabled`  | `text-text-disabled`   | Disabled states, placeholders        |
| `--color-text-inverse`   | `text-text-inverse`    | On dark / saturated fills            |
| `--color-overlay`        | `bg-overlay/40`        | Scrim behind modals / lightboxes     |

## Typography

Inter is the body font. The display variant is reserved for `h1`/`h2` and large numerals.

| Token               | Class             | Size / line-height | Weight |
| ------------------- | ----------------- | ------------------ | ------ |
| `--text-display-lg` | `text-display-lg` | 30 / 36            | 700    |
| `--text-display`    | `text-display`    | 24 / 32            | 700    |
| `--text-h2`         | `text-h2`         | 20 / 28            | 600    |
| `--text-h3`         | `text-h3`         | 18 / 24            | 600    |
| `--text-body-lg`    | `text-body-lg`    | 16 / 24            | 400    |
| `--text-body`       | `text-body`       | 14 / 22            | 400    |
| `--text-caption`    | `text-caption`    | 12 / 16            | 400    |

`PageHeader` uses `text-display` for the page title; section headings use `text-h2`/`text-h3`.

## Spacing

The 8px rhythm is supplied by Tailwind's default scale (`gap-2` = 8px, `gap-4` = 16px, `gap-6` = 24px). Named aliases make page-level layout self-documenting.

| Token                       | Value | Use                             |
| --------------------------- | ----- | ------------------------------- |
| `--spacing-page-x`          | 24px  | Page horizontal padding         |
| `--spacing-page-y`          | 32px  | Page vertical padding           |
| `--spacing-section-gap`     | 32px  | Gap between major page sections |
| `--spacing-card-padding`    | 24px  | Default card body padding       |
| `--spacing-card-padding-sm` | 20px  | Compact card body padding       |

## Shadows

| Token                 | Class               | Use                               |
| --------------------- | ------------------- | --------------------------------- |
| `--shadow-card`       | `shadow-card`       | Default card / list elevation     |
| `--shadow-card-hover` | `shadow-card-hover` | Card hover state                  |
| `--shadow-popover`    | `shadow-popover`    | Dropdowns, tooltips               |
| `--shadow-modal`      | `shadow-modal`      | Dialogs, lightbox                 |
| `--shadow-focus`      | `shadow-focus`      | Focus ring around custom controls |

## Radii

| Token             | Class            | Use                   |
| ----------------- | ---------------- | --------------------- |
| `--radius-card`   | `rounded-card`   | Cards, tables, panels |
| `--radius-button` | `rounded-button` | Buttons, inputs       |
| `--radius-input`  | `rounded-input`  | Form controls         |
| `--radius-pill`   | `rounded-pill`   | Badges, pills         |

## When to use what

- **Surface, text, border tokens** — for everything that isn't a deliberate signal. This is the default.
- **Signal scales** — when conveying state (success, warning, danger, info).
- **Brand `primary`** — only for primary actions, the active nav item, focus rings, and `info` accents that double as brand.
- **Tailwind raw `gray-*` / `blue-*` / etc.** — banned by `eslint-plugin-better-tailwindcss` (`no-restricted-classes`); use the semantic tokens above.

## Migration map (raw palette to token)

When converting legacy raw-palette classes, use this canonical mapping. The prefix (`bg`/`text`/`border`/`ring`/`divide`/`outline`) is preserved; only the color + step changes.

### Neutral / gray family (`gray`, `slate`, `zinc`, `neutral`, `stone`)

| Raw                                        | Token                                                         |
| ------------------------------------------ | ------------------------------------------------------------- |
| `bg-white`                                 | `bg-surface`                                                  |
| `text-white`                               | `text-text-inverse`                                           |
| `bg-{gray}-50`                             | `bg-surface-muted`                                            |
| `bg-{gray}-100`                            | `bg-surface-sunken`                                           |
| `border\|ring\|divide\|outline-{gray}-100` | `…-border-subtle`                                             |
| `border\|ring\|divide\|outline-{gray}-200` | `…-border`                                                    |
| `border\|ring\|divide\|outline-{gray}-300` | `…-border-strong`                                             |
| `text-{gray}-900` (and `-950`)             | `text-text-primary`                                           |
| `text-{gray}-600\|700\|800`                | `text-text-secondary`                                         |
| `text-{gray}-500`                          | `text-text-muted`                                             |
| `text-{gray}-400`                          | `text-text-disabled` (body text → `text-text-muted` for WCAG) |
| `placeholder-{gray}-400`                   | `placeholder-text-disabled`                                   |

Darker gray backgrounds (`bg-{gray}-200`..`900`) have no surface token — pick the closest of `bg-surface-sunken` / `bg-text-primary` (dark chips) by intent.

### Signal families (status colors)

| Raw color                             | Token scale        | Notes                      |
| ------------------------------------- | ------------------ | -------------------------- |
| `blue`, `indigo`, `sky`               | `primary` / `info` | identical hex to `primary` |
| `red`, `rose`                         | `danger`           |                            |
| `green`, `emerald`                    | `success`          | `success` is emerald-based |
| `amber`, `yellow`, `orange`           | `warning`          | `warning` is amber-based   |
| `purple`, `violet`, `fuchsia`, `pink` | `accent`           | `accent` is violet-based   |

Signal scales stop at step `900`; map any `-950` source to `-900` (except `primary`, which defines `-950`).

## Categorical (data-viz) colors

A small set of modules assign **distinct hues to categories** for visual separation, not to convey state. These are the one allowed exception to the raw-palette ban and are allow-listed in [eslint.config.mjs](../eslint.config.mjs):

- [src/lib/strategy-property-colors.ts](../src/lib/strategy-property-colors.ts) — fixed per-property badge colors (model, aspect ratio, resolution, …).

Recharts series colors are passed as hex props, not Tailwind classes, so they are unaffected. Do not add new categorical palettes without documenting them here and in the lint allow-list.

## Adding a token

1. Add it to the `@theme` block in `globals.css`.
2. Document it here with a short description of intent.
3. Update [.cursor/rules/ui-conventions.mdc](../.cursor/rules/ui-conventions.mdc) if it changes a documented pattern.
