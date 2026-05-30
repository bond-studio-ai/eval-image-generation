import nextConfig from "eslint-config-next";
import prettierConfig from "eslint-config-prettier";
import betterTailwind from "eslint-plugin-better-tailwindcss";

/**
 * Raw Tailwind palette utilities are banned in favor of the semantic tokens
 * defined in `src/app/globals.css` (`bg-surface`, `text-text-secondary`,
 * `border-border`, signal scales, etc.). See `.cursor/rules/ui-conventions.mdc`
 * and `docs/DESIGN_TOKENS.md`.
 *
 * The class-level bans (raw palette colors, bare font sizes, white/black) are
 * fully migrated, so they are hard errors. The raw-`<button>` rule stays a
 * warning: it nudges toward the primitives but tolerates the legitimate custom
 * controls (dropdown triggers, toggles, pagination, clickable overlays) that
 * the primitive variants don't model.
 */
const RESTRICTED_CLASS_LEVEL = "error";
const RAW_BUTTON_LEVEL = "warn";
// Matched per-class with `String.match`, so anchoring is by boundary, not `^`/`$`.
// One shared prefix list keeps the palette and white/black bans in lockstep —
// otherwise raw values on the rarer prefixes (from/via/outline/…) slip through.
const COLOR_PREFIXES = "bg|text|border|ring|from|to|via|fill|stroke|divide|outline|shadow|decoration|accent|caret|placeholder";
const RAW_PALETTE_PATTERN = `(?:${COLOR_PREFIXES})-(?:gray|slate|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950)`;
const RAW_FONT_SIZE_PATTERN = "(?<![\\w-])text-(?:xs|sm|base|lg|xl|[2-9]xl)(?![\\w-])";
const RAW_WHITE_BLACK_PATTERN = `(?:${COLOR_PREFIXES})-(?:white|black)(?![\\w-])`;

const eslintConfig = [
  ...nextConfig,
  prettierConfig,
  {
    plugins: {
      "better-tailwindcss": betterTailwind
    },
    settings: {
      "better-tailwindcss": {
        entryPoint: "src/app/globals.css"
      }
    },
    rules: {
      "no-unused-vars": "off",
      // The repo has existing React Compiler diagnostics in older UI
      // surfaces. Keep lint usable while those files are refactored
      // behind focused tests.
      "react-hooks/refs": "off",
      "react-hooks/rules-of-hooks": "off",
      "react-hooks/set-state-in-effect": "off",
      // Import ordering (replaces @ianvs/prettier-plugin-sort-imports). The
      // `import` plugin ships with eslint-config-next; `eslint --fix` sorts.
      "import/order": [
        "error",
        {
          groups: ["builtin", "external", "internal", "parent", "sibling", "index"],
          pathGroups: [{ pattern: "@/**", group: "internal" }],
          "newlines-between": "never",
          alphabetize: { order: "asc", caseInsensitive: true }
        }
      ],
      // Correctness: catch genuinely broken class strings. Class *ordering* is
      // owned by prettier-plugin-tailwindcss, so the stylistic order rule stays
      // off to avoid a fight between the two.
      // `auth-sign-in-page` is a hand-authored CSS hook (see sign-in-page.css)
      // used to scope overrides of Clerk's markup, not a Tailwind utility.
      "better-tailwindcss/no-unknown-classes": ["error", { ignore: ["auth-sign-in-page"] }],
      "better-tailwindcss/no-duplicate-classes": "error",
      // `no-conflicting-classes` over-reports the standard focus-ring idiom
      // (`outline` + `outline-2`), so keep it as a warning rather than a blocker.
      "better-tailwindcss/no-conflicting-classes": "warn",
      // Ban raw palette colors, bare font-size utilities, and raw white/black in
      // favor of semantic tokens. `tailwindcss-merge`-aware: applies to className
      // strings and the `cn()` helper alike.
      "better-tailwindcss/no-restricted-classes": [
        RESTRICTED_CLASS_LEVEL,
        {
          restrict: [
            {
              pattern: RAW_PALETTE_PATTERN,
              message: "Use a semantic token (bg-surface, text-text-secondary, border-border, or a signal scale like text-success-700) instead of a raw Tailwind palette color. See docs/DESIGN_TOKENS.md."
            },
            {
              pattern: RAW_FONT_SIZE_PATTERN,
              message: "Use a typography ramp token (text-caption, text-body, text-h3, text-display, etc.) instead of a raw font-size utility. See docs/DESIGN_TOKENS.md."
            },
            {
              pattern: RAW_WHITE_BLACK_PATTERN,
              message: "Use a semantic token (bg-surface, text-text-inverse, border-border) instead of raw white/black. See docs/DESIGN_TOKENS.md."
            }
          ]
        }
      ]
    }
  },
  {
    // Categorical data-viz palettes assign distinct hues to categories for
    // visual separation, not to convey state. They are the one allowed
    // exception to the raw-palette ban. See docs/DESIGN_TOKENS.md.
    files: ["src/lib/strategy-property-colors.ts"],
    rules: {
      "better-tailwindcss/no-restricted-classes": "off"
    }
  },
  {
    // Raw <button> is banned everywhere except the primitives that implement it.
    // Use <Button>, <IconButton>, or <LinkButton> from `@/components/ui`.
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/components/ui/button.tsx", "src/components/ui/icon-button.tsx"],
    rules: {
      "no-restricted-syntax": [
        RAW_BUTTON_LEVEL,
        {
          selector: "JSXOpeningElement[name.name='button']",
          message: "Use the <Button>/<IconButton> primitives from @/components/ui instead of a raw <button>. See .cursor/rules/ui-conventions.mdc."
        }
      ]
    }
  }
];

export default eslintConfig;
