# Library & Dependency Conventions

## Principle

**Strongly prefer a well-maintained, widely-adopted library over hand-rolling
equivalent behavior.** Established libraries carry the accessibility, edge-case,
focus-management, and cross-browser work that hand-rolled versions silently miss,
and they shrink the surface area we have to own and test.

Reach for a library first for anything in the "solved problem" category:

- **Overlays & interaction** — dialogs, popovers, tooltips, hover cards,
  dropdowns / command palettes (Radix UI + `cmdk`).
- **Tables, graphs, layout** — data tables (`@tanstack/react-table`), node graphs
  / DAGs (`@xyflow/react` + `@dagrejs/dagre`).
- **Editors & syntax** — code/template editors (CodeMirror 6 via
  `@uiw/react-codemirror`).
- **Data fetching / caching / polling** — `@tanstack/react-query`.
- **Widgets** — dates (`react-day-picker`), compare sliders
  (`react-compare-slider`), uploads (`react-dropzone`), lightboxes
  (`yet-another-react-lightbox`), charts (`recharts`), toasts (`sonner`).
- **Utility idioms** — `es-toolkit`, `clsx` + `tailwind-merge`, `ms`, `bytes`,
  `http-status-codes`, `zod` for boundary validation.

Rules of thumb:

- Add dependencies with **Yarn** (`yarn add` / `yarn add -D`). Never `npm`.
- Don't hand-roll focus traps, click-outside, positioning, keyboard navigation,
  fuzzy filtering, or layout algorithms when a primitive already exists.
- Keep wrappers **thin** — adapt the library to our design tokens and `ui/`
  primitives; don't rebuild it on top of the dependency.
- If you deliberately hand-roll something or defer adopting a library, **record
  the reason in one of the Exceptions sections below** so it isn't "fixed" later.

## Current stack

This codebase went through a deliberate pass replacing hand-rolled UI/logic with
libraries (Radix primitives, `cmdk`, `@tanstack/react-table` + React Query,
`@xyflow/react` + dagre, CodeMirror 6, `react-day-picker`, `recharts`,
`es-toolkit`, and more). See `package.json` for the current set and git history
for the per-migration commits.

Two editor decisions are worth keeping in mind:

- The prompt editor keeps a small in-repo Handlebars `StreamLanguage`
  (`prompt-template-editor/handlebars-language.ts`) instead of
  `@codemirror/lang-handlebars`. That package parses Handlebars-in-HTML and would
  mis-highlight free-text prompt prose, so owning the ~120-line lexer is deliberate.
- The custom Handlebars validator (`src/lib/validate-handlebars.ts`) and the three
  editor insert popovers (`reference`/`conditional`/`dollhouse`) were intentionally
  left on their existing implementations.

## Exceptions — evaluated, not adopted (yet)

- **Forms → react-hook-form.** Not adopted. The candidate forms are a poor fit:
  `strategy-builder.tsx` is a multi-step builder (not a field form),
  `image-evaluation-form.tsx` is a debounced autosave form built on
  `useEffectEvent`, and the input-preset / prompt-version create/edit forms are
  composed almost entirely of custom controlled components (`ResourceFormHeader`,
  `DesignSettingsEditor`, `PromptTemplateEditor`) driven by `useReducer`. RHF would
  add `Controller` boilerplate around each custom input without removing the state
  logic, for little validation benefit and meaningful regression risk on core
  create flows.
- **Extend zod to `service-client.ts` per-endpoint responses.** The two clean,
  lenient normalizers (`generation-row.ts`, `projects.ts` summary) were converted.
  The remaining `fetchService<T>` cast sites and the tested, intricate dollhouse
  camera-frame normalizers (`dollhouse-renders.ts`) were left: they carry high
  shape-match risk for little code reduction and the dollhouse ones are already
  covered by unit tests.
- **`nuqs` for `useInfiniteList` URL state.** Not adopted. The hook's filter
  contract is arbitrary string keys (each table sets different ones), which nuqs's
  typed per-key parser model doesn't fit; the existing shallow
  `history.replaceState` already provides no-pollution URL sync. The data fetching
  _was_ migrated to React Query.
- **Layout-preset / design-package selectors.** Left as rich modal pickers
  (thumbnails + descriptions), a different pattern from the dropdown
  `SearchableSelect`. They could be routed through the (now Radix-backed) `Modal`
  primitive for a focus trap in a small follow-up.

## Exceptions — intentionally kept hand-rolled

- **`two-pane-split.tsx`** — `react-resizable-panels` is JS-driven and
  percentage-based; it would regress the current SSR-safe CSS responsive stacking
  (introducing a first-paint layout shift) and the pixel-based min pane width.
- **`casing.ts`** — `es-toolkit`'s `camelCase` diverges on digit-aware keys
  (`foo_3d` → `foo3D` vs the required `foo3d`), which is backend-key-critical
  (SAM prompt table, design fields).
- **`image-evaluation-form.tsx` autosave debounce** — wraps a `useEffectEvent`,
  which lint forbids passing into `usehooks-ts`'s `useDebounceCallback`.
- **`render-auto-refresh.tsx`** — polls an SSR page via `router.refresh()`, which
  React Query's `refetchInterval` does not model.
- **`section-nav.tsx` / audit `run-picker.tsx` observers** — a multi-element
  scroll-spy and a custom scroll-container `root` respectively, neither of which
  fits `react-intersection-observer`'s single-element `useInView`.
