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
- **Tailwind raw `gray-*`** — avoid in new code; prefer the semantic tokens above.

## Adding a token

1. Add it to the `@theme` block in `globals.css`.
2. Document it here with a short description of intent.
3. Update [.cursor/rules/ui-conventions.mdc](../.cursor/rules/ui-conventions.mdc) if it changes a documented pattern.
