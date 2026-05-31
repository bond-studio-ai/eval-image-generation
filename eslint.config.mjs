import { fileURLToPath } from "node:url";
import nextConfig from "eslint-config-next";
import prettierConfig from "eslint-config-prettier";
import betterTailwind from "eslint-plugin-better-tailwindcss";
import tseslint from "typescript-eslint";
import unicorn from "eslint-plugin-unicorn";
import regexp from "eslint-plugin-regexp";
import sonarjs from "eslint-plugin-sonarjs";
import promise from "eslint-plugin-promise";
import security from "eslint-plugin-security";
import perfectionist from "eslint-plugin-perfectionist";
import stylistic from "@stylistic/eslint-plugin";
import unusedImports from "eslint-plugin-unused-imports";
import arrayFunc from "eslint-plugin-array-func";
import noUnsanitized from "eslint-plugin-no-unsanitized";
import sdl from "@microsoft/eslint-plugin-sdl";
import validateJsxNesting from "eslint-plugin-validate-jsx-nesting";
import preferFunctionComponent from "eslint-plugin-react-prefer-function-component";
import eslintComments from "@eslint-community/eslint-plugin-eslint-comments";
import noOnlyTests from "eslint-plugin-no-only-tests";

/**
 * This config natively ports eslint-config-hardcore (base + ts + react +
 * react-performance) into the ESLint 9 flat-config / Next 16 stack. Hardcore
 * itself is legacy-eslintrc + ESLint 8 only, so its rule blocks are recreated
 * here as native flat config layered after eslint-config-next.
 *
 * Severity philosophy: hardcore's high-value correctness rules are hard
 * errors. Rules that are valuable as signal but would otherwise be thousands of
 * pre-existing violations (size/complexity limits, magic numbers, type-aware
 * "any" tracing, perf hints) are demoted to `warn` so they surface in editors
 * without blocking `eslint .`. Rules that fundamentally fight Next/React/TS
 * conventions are turned `off` with a justification.
 */
const ERROR = "error";
const WARN = "warn";
const OFF = "off";

const TEST_FILES = ["**/test/**", "**/tests/**", "**/__tests__/**", "**/*.test.*", "**/*.spec.*", "**/*.e2e.*", "tests/**", "e2e/**"];

/* ----------------------------------------------------------------------------
 * Existing local conventions (raw Tailwind palette ban, raw <button> ban).
 * Preserved verbatim from the prior config. See .cursor/rules/ui-conventions.mdc
 * and docs/DESIGN_TOKENS.md.
 * ------------------------------------------------------------------------- */
const RESTRICTED_CLASS_LEVEL = "error";
const RAW_BUTTON_LEVEL = "warn";
const COLOR_PREFIXES = "bg|text|border|ring|from|to|via|fill|stroke|divide|outline|shadow|decoration|accent|caret|placeholder";
const RAW_PALETTE_PATTERN = `(?:${COLOR_PREFIXES})-(?:gray|slate|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950)`;
const RAW_FONT_SIZE_PATTERN = String.raw`(?<![\w-])text-(?:xs|sm|base|lg|xl|[2-9]xl)(?![\w-])`;
const RAW_WHITE_BLACK_PATTERN = String.raw`(?:${COLOR_PREFIXES})-(?:white|black)(?![\w-])`;

// eslint-config-next applies a babel parser to every file and only swaps in the
// typescript-eslint parser inside its `next/typescript` entry (which does NOT
// enable type-aware linting). We drop that entry and own the TS layer below so
// (a) there is no `@typescript-eslint` plugin-redefinition conflict and (b) we
// can turn on type-aware rules via `projectService`.
const nextBase = nextConfig.filter((entry) => entry.name !== "next/typescript");

const eslintConfig = [
  {
    ignores: [".next/**", "out/**", "build/**", "coverage/**", "next-env.d.ts", "**/*.min.*"]
  },

  ...nextBase,

  /* ==========================================================================
   * hardcore base — framework-agnostic ESLint core + plugin rules.
   * ======================================================================= */
  {
    name: "hardcore/base",
    files: ["**/*.{js,mjs,cjs,jsx,ts,tsx,mts,cts}"],
    plugins: {
      unicorn,
      regexp,
      sonarjs,
      promise,
      security,
      perfectionist,
      "@stylistic": stylistic,
      "unused-imports": unusedImports,
      "array-func": arrayFunc,
      "no-unsanitized": noUnsanitized,
      "@microsoft/sdl": sdl,
      "@eslint-community/eslint-comments": eslintComments
    },
    settings: {
      perfectionist: { type: "natural" }
    },
    rules: {
      // --- ESLint core (from hardcore base.json) ---------------------------
      "no-alert": ERROR,
      "no-array-constructor": ERROR,
      "no-bitwise": WARN,
      "no-caller": ERROR,
      "no-case-declarations": ERROR,
      "no-class-assign": ERROR,
      // Application code logs via the `logger` wrapper (src/lib/logger.ts),
      // which holds the single intentional console sink. Keep this an error so
      // stray console.* calls don't creep back in.
      "no-console": ERROR,
      "no-const-assign": ERROR,
      "no-constant-condition": ERROR,
      "no-continue": OFF, // pure-style; `continue` is idiomatic in our loops
      "no-control-regex": ERROR,
      "no-debugger": ERROR,
      "no-delete-var": ERROR,
      "no-dupe-class-members": ERROR,
      "no-dupe-keys": ERROR,
      "no-dupe-args": ERROR,
      "no-duplicate-case": ERROR,
      "no-empty": ERROR,
      "no-empty-pattern": ERROR,
      // `== null` (null-or-undefined check) is an intentional idiom here; see eqeqeq below.
      "no-eq-null": OFF,
      "no-eval": ERROR,
      "no-ex-assign": ERROR,
      "no-extend-native": ERROR,
      "no-extra-bind": ERROR,
      "no-fallthrough": ERROR,
      "no-func-assign": ERROR,
      "no-implied-eval": ERROR,
      "no-inner-declarations": ERROR,
      "no-invalid-regexp": ERROR,
      "no-invalid-this": ERROR,
      "no-iterator": ERROR,
      "no-label-var": ERROR,
      "no-labels": ERROR,
      "no-lone-blocks": ERROR,
      "no-lonely-if": ERROR,
      "no-loop-func": ERROR,
      "no-multi-str": ERROR,
      "no-global-assign": ERROR,
      "no-nested-ternary": WARN,
      "no-new": ERROR,
      "no-new-func": ERROR,
      "no-object-constructor": ERROR,
      "no-new-wrappers": ERROR,
      "no-obj-calls": ERROR,
      "no-octal": ERROR,
      "no-octal-escape": ERROR,
      "no-plusplus": OFF, // pure-style; `i++` is idiomatic and harmless here
      "no-proto": ERROR,
      "no-regex-spaces": ERROR,
      "no-script-url": ERROR,
      "no-self-compare": ERROR,
      "no-shadow-restricted-names": ERROR,
      "no-sparse-arrays": ERROR,
      "no-this-before-super": ERROR,
      "no-throw-literal": ERROR,
      "no-undef-init": ERROR,
      "no-unreachable": ERROR,
      "no-use-before-define": OFF, // handled by @typescript-eslint version for TS
      "no-useless-call": ERROR,
      "no-useless-concat": ERROR,
      // `void` is used to explicitly mark intentionally-floating promises.
      "no-void": [ERROR, { allowAsStatement: true }],
      "no-var": ERROR,
      "no-warning-comments": WARN,
      "no-with": ERROR,
      "block-scoped-var": ERROR,
      // Allow snake_case object properties / destructured fields coming from
      // the snake_case backend API; still enforce camelCase for plain variables.
      camelcase: [ERROR, { properties: "never", ignoreDestructuring: true, ignoreImports: true }],
      "consistent-this": ERROR,
      "constructor-super": ERROR,
      "default-case": ERROR,
      "dot-notation": ERROR,
      // Allow `== null` / `!= null` (null-or-undefined) while requiring `===` elsewhere.
      eqeqeq: [ERROR, "always", { null: "ignore" }],
      "guard-for-in": ERROR,
      // Enforce descriptive names, but allow idiomatic single-letter names:
      // throwaway (`_`), loop indices (`i`/`j`/`k`/`n`), event/error (`e`),
      // comparator operands (`a`/`b`), and coordinates/axes (`x`/`y`/`z`).
      "id-length": [
        ERROR,
        {
          min: 2,
          // Don't flag object/property keys (often external API shapes like
          // recharts' `r` radius, `{ x, y }` points); only names we control.
          properties: "never",
          exceptions: ["_", "a", "b", "e", "i", "j", "k", "n", "x", "y", "z"]
        }
      ],
      "max-depth": WARN,
      "max-nested-callbacks": WARN,
      "max-params": WARN,
      "max-statements": WARN,
      "new-cap": WARN,
      "object-shorthand": ERROR,
      "operator-assignment": ERROR,
      "prefer-const": ERROR,
      "prefer-spread": ERROR,
      "prefer-template": ERROR,
      radix: ERROR,
      "require-yield": ERROR,
      yoda: ERROR,
      "no-empty-function": ERROR,
      "no-new-native-nonconstructor": ERROR,
      "no-unmodified-loop-condition": ERROR,
      "prefer-rest-params": ERROR,
      "no-extra-label": ERROR,
      "no-unused-labels": ERROR,
      "no-useless-constructor": ERROR,
      "no-useless-escape": ERROR,
      // Core rule is type-blind and conflicts with consistent-type-imports
      // (which intentionally splits type/value imports). Use the import plugin's
      // type-aware version instead.
      "no-duplicate-imports": OFF,
      "import/no-duplicates": [ERROR, { "prefer-inline": false }],
      "no-unsafe-finally": ERROR,
      "no-useless-computed-key": [ERROR, { enforceForClassMembers: true }],
      "no-useless-rename": ERROR,
      "max-lines": WARN,
      "no-template-curly-in-string": ERROR,
      "symbol-description": ERROR,
      "prefer-numeric-literals": ERROR,
      "no-useless-return": ERROR,
      "require-await": ERROR,
      "no-await-in-loop": WARN,
      "no-multi-assign": ERROR,
      "prefer-promise-reject-errors": ERROR,
      "no-compare-neg-zero": ERROR,
      "for-direction": ERROR,
      "getter-return": ERROR,
      "max-classes-per-file": WARN,
      "no-misleading-character-class": ERROR,
      "require-atomic-updates": WARN,
      "no-async-promise-executor": ERROR,
      "no-useless-catch": ERROR,
      "prefer-named-capture-group": OFF, // noisy; regexp/prefer-named-capture-group covers intent
      "no-redeclare": ERROR,
      "no-prototype-builtins": ERROR,
      "no-import-assign": ERROR,
      "default-param-last": ERROR,
      "no-constructor-return": ERROR,
      "no-dupe-else-if": ERROR,
      "no-setter-return": ERROR,
      "prefer-exponentiation-operator": ERROR,
      "prefer-object-spread": ERROR,
      "accessor-pairs": ERROR,
      "default-case-last": ERROR,
      "no-useless-backreference": ERROR,
      "no-loss-of-precision": ERROR,
      "no-promise-executor-return": ERROR,
      "no-unreachable-loop": ERROR,
      "no-nonoctal-decimal-escape": ERROR,
      "init-declarations": ERROR,
      "consistent-return": ERROR,
      "no-unused-private-class-members": ERROR,
      "no-constant-binary-expression": ERROR,
      "no-empty-static-block": ERROR,
      // Disabled in favor of the type-aware @typescript-eslint/no-magic-numbers
      // below — the two rules double-report every literal across the TS codebase.
      "no-magic-numbers": OFF,
      complexity: [WARN, { max: 10 }],
      "func-names": [ERROR, "as-needed"],
      // hardcore sets func-style: declaration, which forbids the
      // `const Foo = () => {}` React component idiom used throughout. Off.
      "func-style": OFF,
      "one-var": [ERROR, "never"],
      "no-else-return": [ERROR, { allowElseIf: false }],
      // Allow the `while ((m = regex.exec(s)))` iteration idiom when parenthesized.
      "no-cond-assign": [ERROR, "except-parens"],
      "no-irregular-whitespace": [ERROR, { skipStrings: false }],
      "valid-typeof": [ERROR, { requireStringLiterals: true }],
      "no-return-assign": [ERROR, "always"],
      "no-self-assign": [ERROR, { props: true }],
      "no-shadow": OFF, // handled by @typescript-eslint/no-shadow for TS
      "no-undef": [ERROR, { typeof: true }],
      "no-underscore-dangle": OFF, // underscore-prefixed opt-outs are used by convention
      "no-unneeded-ternary": [ERROR, { defaultAssignment: false }],
      "func-name-matching": [ERROR, { considerPropertyDescriptor: true }],
      "use-isnan": [ERROR, { enforceForSwitchCase: true, enforceForIndexOf: true }],
      "no-param-reassign": [
        ERROR,
        {
          props: true,
          // DOM elements, refs, and events are routinely mutated in place.
          ignorePropertyModificationsFor: ["accumulator", "ctx", "context", "req", "request", "res", "response", "draft", "state", "el", "element", "node", "ref", "current", "e", "event", "target"]
        }
      ],
      "no-unsafe-negation": [ERROR, { enforceForOrderingRelations: true }],
      "grouped-accessor-pairs": [ERROR, "getBeforeSet"],
      "no-implicit-globals": [ERROR, { lexicalBindings: true }],
      "array-callback-return": [ERROR, { allowImplicit: false, checkForEach: true }],
      "no-extra-boolean-cast": [ERROR, { enforceForLogicalOperands: true }],
      "multiline-comment-style": OFF, // conflicts with common JSDoc/banner styles
      "no-unsafe-optional-chaining": [ERROR, { disallowArithmeticOperators: true }],
      "no-unused-expressions": OFF, // handled by @typescript-eslint version
      "no-sequences": [ERROR, { allowInParentheses: false }],
      // `boolean: false` keeps the `!!x` idiom: rewriting it to `Boolean(x)`
      // breaks TypeScript's aliased-condition narrowing (`const ok = !!x; if (ok) {...x...}`).
      "no-implicit-coercion": [ERROR, { boolean: false, disallowTemplateShorthand: true }],
      "prefer-regex-literals": [ERROR, { disallowRedundantWrapping: true }],
      "logical-assignment-operators": [ERROR, "always", { enforceForIfStatements: true }],
      "prefer-destructuring": OFF, // handled by @typescript-eslint version for TS

      // --- promise ---------------------------------------------------------
      "promise/param-names": ERROR,
      "promise/always-return": WARN,
      "promise/no-return-wrap": ERROR,
      "promise/no-nesting": WARN,
      "promise/no-promise-in-callback": WARN,
      "promise/avoid-new": OFF, // we legitimately construct Promises
      "promise/no-callback-in-promise": WARN,
      "promise/no-return-in-finally": ERROR,
      "promise/valid-params": ERROR,
      "promise/no-new-statics": ERROR,
      "promise/no-multiple-resolved": ERROR,
      "promise/catch-or-return": [ERROR, { allowFinally: true }],
      "promise/prefer-await-to-then": [WARN, { strict: true }],

      // --- security --------------------------------------------------------
      "security/detect-buffer-noassert": ERROR,
      "security/detect-child-process": ERROR,
      "security/detect-disable-mustache-escape": ERROR,
      "security/detect-eval-with-expression": ERROR,
      "security/detect-new-buffer": ERROR,
      "security/detect-no-csrf-before-method-override": ERROR,
      "security/detect-non-literal-regexp": WARN,
      "security/detect-non-literal-require": ERROR,
      "security/detect-possible-timing-attacks": WARN,
      "security/detect-pseudoRandomBytes": ERROR,
      "security/detect-unsafe-regex": ERROR,
      "security/detect-bidi-characters": ERROR,

      // --- unused-imports (autofix removes dead imports) -------------------
      "unused-imports/no-unused-imports": ERROR,

      // --- unicorn ---------------------------------------------------------
      "unicorn/custom-error-definition": ERROR,
      "unicorn/error-message": ERROR,
      "unicorn/escape-case": ERROR,
      "unicorn/new-for-builtins": ERROR,
      "unicorn/no-abusive-eslint-disable": ERROR,
      "unicorn/no-instanceof-array": ERROR,
      "unicorn/no-console-spaces": ERROR,
      "unicorn/no-for-loop": ERROR,
      "unicorn/no-hex-escape": ERROR,
      "unicorn/no-new-buffer": ERROR,
      "unicorn/no-unreadable-array-destructuring": ERROR,
      "unicorn/no-unused-properties": WARN,
      "unicorn/no-zero-fractions": ERROR,
      "unicorn/prefer-add-event-listener": ERROR,
      "unicorn/prefer-keyboard-event-key": ERROR,
      "unicorn/prefer-array-flat-map": ERROR,
      "unicorn/prefer-includes": ERROR,
      "unicorn/prefer-dom-node-append": ERROR,
      "unicorn/prefer-dom-node-remove": ERROR,
      "unicorn/prefer-query-selector": WARN,
      "unicorn/prefer-string-starts-ends-with": ERROR,
      "unicorn/prefer-dom-node-text-content": ERROR,
      "unicorn/prefer-type-error": ERROR,
      "unicorn/throw-new-error": ERROR,
      "unicorn/consistent-function-scoping": WARN,
      "unicorn/prefer-reflect-apply": ERROR,
      "unicorn/prefer-dom-node-dataset": ERROR,
      "unicorn/prefer-string-slice": ERROR,
      "unicorn/prefer-negative-index": ERROR,
      "unicorn/prefer-string-trim-start-end": ERROR,
      "unicorn/prefer-modern-dom-apis": ERROR,
      "unicorn/prefer-string-replace-all": ERROR,
      "unicorn/prefer-number-properties": ERROR,
      "unicorn/no-null": OFF, // React renders null; ubiquitous and idiomatic
      "unicorn/prefer-optional-catch-binding": ERROR,
      "unicorn/no-object-as-default-parameter": ERROR,
      "unicorn/explicit-length-check": ERROR,
      "unicorn/prefer-math-trunc": ERROR,
      "unicorn/prefer-ternary": WARN,
      "unicorn/numeric-separators-style": ERROR,
      "unicorn/catch-error-name": ERROR,
      "unicorn/no-lonely-if": ERROR,
      "unicorn/prefer-date-now": ERROR,
      "unicorn/prefer-array-some": ERROR,
      "unicorn/prefer-default-parameters": ERROR,
      "unicorn/no-new-array": ERROR,
      "unicorn/prefer-array-index-of": ERROR,
      "unicorn/prefer-regexp-test": ERROR,
      "unicorn/consistent-destructuring": ERROR,
      "unicorn/no-array-push-push": ERROR,
      "unicorn/no-this-assignment": ERROR,
      "unicorn/no-static-only-class": ERROR,
      "unicorn/prefer-array-flat": ERROR,
      "unicorn/prefer-switch": WARN,
      "unicorn/prefer-node-protocol": ERROR,
      "unicorn/prefer-module": ERROR,
      "unicorn/no-document-cookie": ERROR,
      "unicorn/require-array-join-separator": ERROR,
      "unicorn/require-number-to-fixed-digits-argument": ERROR,
      "unicorn/no-array-method-this-argument": ERROR,
      "unicorn/prefer-prototype-methods": ERROR,
      "unicorn/no-useless-length-check": ERROR,
      "unicorn/no-useless-spread": ERROR,
      "unicorn/no-useless-fallback-in-spread": ERROR,
      "unicorn/no-invalid-remove-event-listener": ERROR,
      "unicorn/no-empty-file": ERROR,
      "unicorn/prefer-code-point": ERROR,
      "unicorn/no-await-expression-member": ERROR,
      "unicorn/no-thenable": ERROR,
      "unicorn/no-useless-promise-resolve-reject": ERROR,
      "unicorn/relative-url-style": ERROR,
      "unicorn/text-encoding-identifier-case": ERROR,
      "unicorn/no-useless-switch-case": ERROR,
      "unicorn/prefer-modern-math-apis": ERROR,
      "unicorn/no-unreadable-iife": ERROR,
      // Disabled: its autofix drops type-guard predicates (e.g.
      // `(x): x is T => !!x` -> `Boolean`), silently breaking narrowing.
      "unicorn/prefer-native-coercion-functions": OFF,
      "unicorn/prefer-logical-operator-over-ternary": WARN,
      "unicorn/prefer-event-target": ERROR,
      "unicorn/no-unnecessary-await": ERROR,
      "unicorn/switch-case-braces": ERROR,
      "unicorn/no-typeof-undefined": ERROR,
      "unicorn/prefer-set-size": ERROR,
      "unicorn/no-negated-condition": WARN,
      "unicorn/prefer-at": ERROR,
      "unicorn/prefer-blob-reading-methods": ERROR,
      "unicorn/no-single-promise-in-promise-methods": ERROR,
      "unicorn/no-await-in-promise-methods": ERROR,
      "unicorn/no-anonymous-default-export": ERROR,
      "unicorn/consistent-empty-array-spread": ERROR,
      "unicorn/prefer-string-raw": ERROR,
      "unicorn/no-invalid-fetch-options": ERROR,
      "unicorn/no-magic-array-flat-depth": ERROR,
      "unicorn/prefer-structured-clone": ERROR,
      "unicorn/no-negation-in-equality-check": ERROR,
      "unicorn/prefer-global-this": OFF, // Next mixes browser/node globals
      "unicorn/prefer-math-min-max": ERROR,
      "unicorn/consistent-existence-index-check": ERROR,
      "unicorn/filename-case": [ERROR, { cases: { kebabCase: true, camelCase: true, pascalCase: true } }],
      "unicorn/prevent-abbreviations": OFF, // huge churn on props/params naming
      "unicorn/prefer-object-from-entries": ERROR,
      "unicorn/prefer-export-from": [ERROR, { ignoreUsedVariables: true }],
      "unicorn/no-useless-undefined": OFF, // React/optional props pass undefined intentionally

      // --- array-func ------------------------------------------------------
      "array-func/from-map": ERROR,
      "array-func/prefer-array-from": ERROR,
      "array-func/avoid-reverse": ERROR,

      // --- sonarjs (base subset) ------------------------------------------
      "sonarjs/no-all-duplicated-branches": ERROR,
      "sonarjs/no-element-overwrite": ERROR,
      "sonarjs/no-extra-arguments": ERROR,
      "sonarjs/no-identical-conditions": ERROR,
      "sonarjs/no-identical-expressions": ERROR,
      "sonarjs/no-use-of-empty-return-value": ERROR,
      "sonarjs/max-switch-cases": ERROR,
      "sonarjs/no-collapsible-if": WARN,
      "sonarjs/no-identical-functions": WARN,
      "sonarjs/no-inverted-boolean-check": ERROR,
      "sonarjs/no-redundant-boolean": ERROR,
      "sonarjs/no-small-switch": WARN,
      "sonarjs/no-redundant-jump": ERROR,
      "sonarjs/no-same-line-conditional": ERROR,
      "sonarjs/no-gratuitous-expressions": ERROR,
      "sonarjs/no-nested-switch": WARN,
      "sonarjs/no-empty-collection": ERROR,
      "sonarjs/no-nested-template-literals": ERROR,
      "sonarjs/cognitive-complexity": [WARN, 15],
      "sonarjs/no-nested-functions": OFF,
      "sonarjs/todo-tag": OFF,
      "sonarjs/no-commented-code": OFF,

      // --- eslint-comments -------------------------------------------------
      "@eslint-community/eslint-comments/no-duplicate-disable": ERROR,
      "@eslint-community/eslint-comments/no-unlimited-disable": ERROR,
      "@eslint-community/eslint-comments/no-unused-disable": ERROR,
      "@eslint-community/eslint-comments/no-unused-enable": ERROR,
      "@eslint-community/eslint-comments/disable-enable-pair": [ERROR, { allowWholeFile: true }],
      "@eslint-community/eslint-comments/no-use": [
        ERROR,
        {
          allow: ["eslint-disable", "eslint-disable-next-line", "eslint-disable-line", "eslint-enable", "global"]
        }
      ],

      // --- regexp ----------------------------------------------------------
      "regexp/match-any": ERROR,
      "regexp/no-empty-capturing-group": ERROR,
      "regexp/no-dupe-characters-character-class": ERROR,
      "regexp/no-empty-group": ERROR,
      "regexp/no-empty-lookarounds-assertion": ERROR,
      "regexp/no-escape-backspace": ERROR,
      "regexp/no-invisible-character": ERROR,
      "regexp/no-octal": ERROR,
      "regexp/no-useless-two-nums-quantifier": ERROR,
      "regexp/prefer-d": ERROR,
      "regexp/prefer-plus-quantifier": ERROR,
      "regexp/prefer-question-quantifier": ERROR,
      "regexp/prefer-star-quantifier": ERROR,
      "regexp/prefer-w": ERROR,
      "regexp/prefer-quantifier": ERROR,
      "regexp/no-useless-character-class": ERROR,
      "regexp/no-useless-lazy": ERROR,
      "regexp/prefer-regexp-exec": ERROR,
      "regexp/prefer-regexp-test": ERROR,
      "regexp/prefer-unicode-codepoint-escapes": ERROR,
      "regexp/no-useless-range": ERROR,
      "regexp/prefer-range": ERROR,
      "regexp/prefer-character-class": ERROR,
      "regexp/no-useless-non-capturing-group": ERROR,
      "regexp/no-useless-escape": ERROR,
      "regexp/negation": ERROR,
      "regexp/no-legacy-features": ERROR,
      "regexp/no-useless-dollar-replacements": ERROR,
      "regexp/prefer-escape-replacement-dollar-char": ERROR,
      "regexp/no-unused-capturing-group": ERROR,
      "regexp/confusing-quantifier": ERROR,
      "regexp/no-empty-alternative": ERROR,
      "regexp/no-lazy-ends": ERROR,
      "regexp/optimal-lookaround-quantifier": ERROR,
      "regexp/no-trivially-nested-assertion": ERROR,
      "regexp/no-potentially-useless-backreference": ERROR,
      "regexp/no-obscure-range": ERROR,
      "regexp/no-optional-assertion": ERROR,
      "regexp/no-useless-assertions": ERROR,
      "regexp/prefer-named-backreference": ERROR,
      "regexp/no-useless-flag": ERROR,
      "regexp/no-trivially-nested-quantifier": ERROR,
      "regexp/sort-flags": ERROR,
      "regexp/no-non-standard-flag": ERROR,
      "regexp/control-character-escape": ERROR,
      "regexp/prefer-predefined-assertion": ERROR,
      "regexp/no-standalone-backslash": ERROR,
      "regexp/no-useless-quantifier": ERROR,
      "regexp/no-zero-quantifier": ERROR,
      "regexp/no-dupe-disjunctions": ERROR,
      "regexp/optimal-quantifier-concatenation": ERROR,
      "regexp/strict": ERROR,
      "regexp/sort-alternatives": ERROR,
      "regexp/no-super-linear-backtracking": ERROR,
      "regexp/no-super-linear-move": WARN,
      "regexp/no-contradiction-with-assertion": ERROR,
      "regexp/prefer-lookaround": ERROR,
      "regexp/no-empty-character-class": ERROR,
      "regexp/prefer-named-capture-group": OFF, // noisy for trivial regexes
      "regexp/require-unicode-regexp": OFF,
      "regexp/no-misleading-unicode-character": ERROR,
      "regexp/no-control-character": ERROR,
      "regexp/use-ignore-case": ERROR,
      "regexp/prefer-named-replacement": ERROR,
      "regexp/prefer-result-array-groups": ERROR,
      "regexp/no-missing-g-flag": ERROR,
      "regexp/no-extra-lookaround-assertions": ERROR,
      "regexp/no-misleading-capturing-group": ERROR,
      "regexp/simplify-set-operations": ERROR,
      "regexp/no-useless-string-literal": ERROR,
      "regexp/no-empty-string-literal": ERROR,
      "regexp/no-useless-set-operand": ERROR,
      "regexp/prefer-set-operation": ERROR,
      "regexp/grapheme-string-literal": ERROR,
      "regexp/require-unicode-sets-regexp": OFF,
      "regexp/letter-case": [
        ERROR,
        {
          caseInsensitive: "lowercase",
          unicodeEscape: "uppercase",
          hexadecimalEscape: "uppercase",
          controlEscape: "uppercase"
        }
      ],
      "regexp/hexadecimal-escape": [ERROR, "never"],
      "regexp/unicode-escape": [ERROR, "unicodeEscape"],

      // --- Microsoft SDL ---------------------------------------------------
      "@microsoft/sdl/no-cookies": WARN,
      "@microsoft/sdl/no-document-domain": ERROR,
      "@microsoft/sdl/no-html-method": ERROR,
      "@microsoft/sdl/no-insecure-url": WARN,
      "@microsoft/sdl/no-postmessage-star-origin": ERROR,

      // --- no-unsanitized --------------------------------------------------
      "no-unsanitized/method": ERROR,
      "no-unsanitized/property": ERROR,

      // --- perfectionist (autofixable ordering) ---------------------------
      "perfectionist/sort-named-imports": ERROR,
      "perfectionist/sort-named-exports": ERROR,
      "perfectionist/sort-array-includes": ERROR,
      "perfectionist/sort-enums": ERROR,
      "perfectionist/sort-interfaces": OFF, // ordering of type members hurts readability
      "perfectionist/sort-jsx-props": OFF, // ordering of JSX props hurts readability
      "perfectionist/sort-maps": ERROR,
      "perfectionist/sort-object-types": OFF,
      "perfectionist/sort-objects": OFF, // object literal order is often meaningful here
      "perfectionist/sort-switch-case": ERROR,
      "perfectionist/sort-sets": ERROR,

      // --- @stylistic (non-prettier-owned) --------------------------------
      "@stylistic/spaced-comment": [ERROR, "always", { block: { balanced: true } }],
      "@stylistic/lines-between-class-members": [ERROR, "always", { exceptAfterSingleLine: true }]
    }
  },

  /* ==========================================================================
   * hardcore/ts — type-aware TypeScript rules. Replaces next/typescript.
   * ======================================================================= */
  ...tseslint.config({
    name: "hardcore/ts",
    files: ["**/*.{ts,tsx,mts,cts}"],
    extends: [tseslint.configs.strictTypeChecked, tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: fileURLToPath(new URL(".", import.meta.url))
      }
    },
    rules: {
      // hardcore/ts explicit configuration ---------------------------------
      "@typescript-eslint/no-magic-numbers": [
        WARN,
        {
          ignore: [0, 1],
          enforceConst: true,
          ignoreArrayIndexes: true,
          ignoreDefaultValues: true,
          ignoreClassFieldInitialValues: true,
          ignoreEnums: true,
          ignoreNumericLiteralTypes: true,
          ignoreReadonlyClassProperties: true,
          ignoreTypeIndexes: true
        }
      ],
      "@typescript-eslint/no-unused-expressions": [ERROR, { enforceForJSX: true }],
      // builtinGlobals is dropped: shadowing DOM globals like `name`/`event`/
      // `status`/`open` via params is pervasive and harmless here.
      "@typescript-eslint/no-shadow": ERROR,
      // hardcore enables this; it is extremely noisy on React props. Off.
      "@typescript-eslint/prefer-readonly-parameter-types": OFF,
      // Allow using hoisted functions and type references before definition
      // (common React helper-below-component ordering).
      "@typescript-eslint/no-use-before-define": [ERROR, { functions: false, variables: false, ignoreTypeReferences: true }],
      "@typescript-eslint/no-meaningless-void-operator": [ERROR, { checkNever: true }],
      // hardcore prefers index-signature; this codebase uses `Record<>` idiomatically.
      "@typescript-eslint/consistent-indexed-object-style": OFF,
      // hardcore forbids all type assertions (`never`); we use `as` pragmatically.
      "@typescript-eslint/consistent-type-assertions": [ERROR, { assertionStyle: "as", objectLiteralTypeAssertions: "allow" }],
      "@typescript-eslint/switch-exhaustiveness-check": [WARN, { requireDefaultForNonUnion: true }],
      // Default options only: the `enforceForRenamedProperties` /
      // `enforceForDeclarationWithTypeAnnotation` flags forced readability-neutral
      // rewrites (e.g. `const id = result.id` -> `const { id } = result`) and were
      // pure noise. Keep the high-value object/array destructuring nudge.
      "@typescript-eslint/prefer-destructuring": [ERROR, { array: true, object: true }],
      "@typescript-eslint/consistent-type-definitions": [ERROR, "interface"],
      "@typescript-eslint/consistent-type-imports": ERROR,
      // etc/no-enum substitute: discourage enums in favor of unions/const objects.
      "no-restricted-syntax": [
        WARN,
        {
          selector: "TSEnumDeclaration",
          message: "Prefer a union type or `as const` object over an enum (hardcore etc/no-enum substitute)."
        }
      ],

      // Noisy type-aware rules: keep as signal, not blockers ---------------
      // Off: the remaining violations are either false positives (effect
      // `let cancelled = false` cleanup flags the rule can't see mutated across
      // the async boundary) or defensive `?? default` reads on zod-validated
      // data. It can't be driven to zero / enforced as an error, so leaving it
      // as a warning would just be ignorable lint spam.
      "@typescript-eslint/no-unnecessary-condition": OFF,
      "@typescript-eslint/strict-boolean-expressions": OFF, // truthy checks are idiomatic here
      // Errors: the API layer is now zod-validated at every fetch boundary
      // (see src/lib/api/), so `any` should no longer leak into the app. Keep
      // these as hard blockers to prevent regressions.
      "@typescript-eslint/no-unsafe-assignment": ERROR,
      "@typescript-eslint/no-unsafe-member-access": ERROR,
      "@typescript-eslint/no-unsafe-call": ERROR,
      "@typescript-eslint/no-unsafe-return": ERROR,
      "@typescript-eslint/no-unsafe-argument": ERROR,
      // Numbers stringify safely and predictably in template literals
      // (`${count}`, `${width}px`); wrapping them in String() is pure noise.
      // Keep any/nullish flagged — those can leak "undefined"/"null"/"[object Object]"
      // into URLs and classNames (explicit opts so the permissive rule defaults
      // for allowAny/allowNullish don't silently apply).
      "@typescript-eslint/restrict-template-expressions": [WARN, { allowNumber: true, allowBoolean: true, allowAny: false, allowNullish: false, allowRegExp: true, allowArray: false }],
      "@typescript-eslint/no-confusing-void-expression": WARN,
      // `||` is the intended operator for string/boolean fallbacks here (display
      // defaults like `name || "Untitled"` and existence guards like `(a || b) &&`),
      // where an empty string / `false` should still fall back. Keep the rule
      // active for number/object/nullish operands, where `||` can silently
      // swallow a valid `0` or mishandle nullishness.
      "@typescript-eslint/prefer-nullish-coalescing": [ERROR, { ignorePrimitives: { string: true, boolean: true } }],
      "@typescript-eslint/prefer-optional-chain": WARN,
      "@typescript-eslint/no-base-to-string": ERROR,
      // Off: the remaining assertions are provably-safe idioms TS can't model
      // under `noUncheckedIndexedAccess` (`Map.get` after `.has()`/`.set()`,
      // modulo-bounded `arr[i % len]`, `arr[0]` after a length check, values
      // captured in event-handler closures behind a render guard). Rewriting
      // them adds verbose guards without removing risk, so the rule can't be
      // enforced as an error — turn it off rather than leave ignorable warnings.
      "@typescript-eslint/no-non-null-assertion": OFF,
      "@typescript-eslint/no-floating-promises": WARN,
      "@typescript-eslint/no-unnecessary-type-conversion": WARN,
      "@typescript-eslint/no-explicit-any": WARN,
      "@typescript-eslint/no-dynamic-delete": ERROR,
      "@typescript-eslint/no-redundant-type-constituents": WARN,
      "@typescript-eslint/no-unnecessary-type-parameters": WARN,
      "@typescript-eslint/no-misused-promises": [WARN, { checksVoidReturn: { attributes: false } }],
      // Frequent false positives when methods are deliberately called via .call().
      "@typescript-eslint/unbound-method": WARN,

      // hardcore/ts explicit "off"s ----------------------------------------
      "@typescript-eslint/member-ordering": OFF,
      "@typescript-eslint/explicit-module-boundary-types": OFF,
      "@typescript-eslint/explicit-function-return-type": OFF,
      "@typescript-eslint/no-restricted-imports": OFF,
      "@typescript-eslint/adjacent-overload-signatures": OFF,
      "@typescript-eslint/class-methods-use-this": OFF,
      // unused vars handled by the dedicated block below + unused-imports
      "@typescript-eslint/no-unused-vars": OFF,
      // naming-convention via strict preset is unset; explicitly keep off (too strict)
      "@typescript-eslint/naming-convention": OFF,
      "@typescript-eslint/prefer-readonly": WARN
    }
  }),

  /* ==========================================================================
   * hardcore/react + react-performance.
   * react / jsx-a11y / react-hooks plugins come from eslint-config-next.
   * ======================================================================= */
  {
    name: "hardcore/react",
    files: ["**/*.{jsx,tsx}"],
    plugins: {
      "validate-jsx-nesting": validateJsxNesting,
      "react-prefer-function-component": preferFunctionComponent
    },
    settings: {
      "jsx-a11y": {
        polymorphicPropName: "as",
        components: { Image: "img", Img: "img" }
      }
    },
    rules: {
      // react (subset of react/all that hardcore tunes) --------------------
      "react/jsx-key": [ERROR, { checkFragmentShorthand: true, checkKeyMustBeforeSpread: true, warnOnDuplicates: true }],
      "react/jsx-max-depth": [WARN, { max: 12 }],
      "react/state-in-constructor": [ERROR, "never"],
      "react/no-string-refs": [ERROR, { noTemplateLiterals: true }],
      "react/no-unsafe": [ERROR, { checkAliases: true }],
      "react/jsx-no-target-blank": [ERROR, { forms: true, warnOnSpreadAttributes: true }],
      "react/jsx-curly-brace-presence": [ERROR, { propElementValues: "always" }],
      "react/destructuring-assignment": [WARN, "always", { destructureInSignature: "always" }],
      // Disabled: this codebase renders heavily with ternaries, and the
      // `coerce` autofixer is destructive on chained ternary render branches.
      "react/jsx-no-leaked-render": OFF,
      "react/display-name": [ERROR, { checkContextObjects: true }],
      "react/no-unknown-property": [ERROR, { requireDataLowercase: true }],
      "react/jsx-no-script-url": [ERROR, { includeFromSettings: true }],
      "react/no-danger": [WARN, { customComponentNames: ["*"] }],
      "react/no-array-index-key": WARN,
      "react/jsx-pascal-case": ERROR,
      "react/no-this-in-sfc": ERROR,
      "react/void-dom-elements-no-children": ERROR,
      "react/no-unstable-nested-components": [ERROR, { allowAsProps: true }],
      "react/jsx-boolean-value": ERROR,
      "react/jsx-fragments": ERROR,
      "react/self-closing-comp": ERROR,
      // hardcore enables these but they fight a TS + Tailwind codebase:
      "react/require-default-props": OFF, // TS optional props cover this
      "react/forbid-prop-types": OFF, // no prop-types in a TS codebase
      "react/boolean-prop-naming": OFF, // too rigid across existing props
      "react/react-in-jsx-scope": OFF,
      "react/prop-types": OFF,

      // react-hooks (exhaustive-deps elevated to error, per hardcore) ------
      "react-hooks/exhaustive-deps": ERROR,

      // jsx-a11y extras hardcore turns on ----------------------------------
      "jsx-a11y/lang": ERROR,
      "jsx-a11y/no-aria-hidden-on-focusable": ERROR,
      "jsx-a11y/alt-text": [ERROR, { img: ["Image", "Img"] }],

      // validate-jsx-nesting -----------------------------------------------
      "validate-jsx-nesting/no-invalid-jsx-nesting": ERROR,

      // react-prefer-function-component ------------------------------------
      "react-prefer-function-component/react-prefer-function-component": ERROR,

      // sonarjs react ------------------------------------------------------
      "sonarjs/no-hook-setter-in-body": ERROR,

      // react-performance (signal-only to avoid wholesale memoization churn)
      "react/jsx-no-constructed-context-values": WARN,
      "react/no-object-type-as-default-prop": WARN
    }
  },

  /* ==========================================================================
   * Test-file relaxations (mirrors hardcore's test overrides).
   * ======================================================================= */
  {
    name: "hardcore/tests",
    files: TEST_FILES,
    plugins: { "no-only-tests": noOnlyTests },
    rules: {
      "no-only-tests/no-only-tests": ERROR,
      // Short identifiers are conventional and low-stakes in tests.
      "id-length": OFF,
      "no-magic-numbers": OFF,
      "@typescript-eslint/no-magic-numbers": OFF,
      "max-statements": OFF,
      "max-lines": OFF,
      "max-lines-per-function": OFF,
      "sonarjs/no-identical-functions": OFF,
      "@typescript-eslint/no-unsafe-assignment": OFF,
      "@typescript-eslint/no-unsafe-member-access": OFF,
      "@typescript-eslint/no-unsafe-call": OFF,
      "@typescript-eslint/no-unsafe-return": OFF,
      "@typescript-eslint/no-unsafe-argument": OFF
    }
  },

  /* ==========================================================================
   * Local UI conventions (preserved from prior config).
   * ======================================================================= */
  {
    plugins: { "better-tailwindcss": betterTailwind },
    settings: { "better-tailwindcss": { entryPoint: "src/app/globals.css" } },
    rules: {
      "better-tailwindcss/no-unknown-classes": [ERROR, { ignore: ["auth-sign-in-page"] }],
      "better-tailwindcss/no-duplicate-classes": ERROR,
      "better-tailwindcss/no-conflicting-classes": WARN,
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
    files: ["src/lib/strategy-property-colors.ts"],
    rules: { "better-tailwindcss/no-restricted-classes": OFF }
  },
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        ERROR,
        {
          args: "after-used",
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          ignoreRestSiblings: true
        }
      ]
    }
  },
  {
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
  },

  // JSX is saturated with positional/size literals (layout offsets, recharts
  // coordinates, pixel math, z-index, durations). Magic-number tracking there is
  // almost entirely noise, so disable it for components while keeping it on for
  // plain TS modules where extracted constants genuinely aid readability.
  {
    files: ["**/*.tsx"],
    rules: {
      "@typescript-eslint/no-magic-numbers": OFF
    }
  },

  // Config files are CommonJS/Node-flavored; relax module-purity rules.
  {
    files: ["**/*.{config,setup}.{js,cjs,mjs,ts}", "*.config.*"],
    rules: {
      "unicorn/prefer-module": OFF,
      "@typescript-eslint/no-magic-numbers": OFF
    }
  },

  prettierConfig
];

export default eslintConfig;
