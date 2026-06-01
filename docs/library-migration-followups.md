# Library migration — follow-up work

This note tracks the deliberately deferred parts of the "replace hand-rolled code
with libraries" effort. Tier 1 (low-risk drop-ins) and most of Tier 2 (medium
refactors) shipped on the `chore/use-libraries` branch. The items below were left
out on purpose, each for a concrete reason — they are not oversights.

## Tier 3 — larger rewrites (shipped)

These shipped on `chore/use-libraries` as individual, visually-verified commits.

- ~~**Prompt template editor → CodeMirror 6**~~. Done: the transparent-textarea
  overlay editor and the regex syntax highlighter (`src/lib/highlight-handlebars.tsx`,
  deleted) were replaced by `@uiw/react-codemirror`, code-split via `next/dynamic`.
  The JSON `<textarea>` in `design-settings-editor.tsx` moved to the same editor
  (`@codemirror/lang-json`). Syntax highlighting uses a small in-repo
  `StreamLanguage` (`prompt-template-editor/handlebars-language.ts`) rather than
  `@codemirror/lang-handlebars`: that package parses Handlebars-in-HTML and would
  mis-highlight free-text prompt prose, so owning the ~120-line lexer is the
  deliberate choice (it also avoids the extra dependency). The custom Handlebars
  validator (`src/lib/validate-handlebars.ts`) and the three insert popovers
  (`reference`/`conditional`/`dollhouse`) were kept as-is.
- ~~**Strategy DAG → React Flow**~~. Done: `src/components/strategy-flow-dag.tsx`
  now builds nodes/edges and lays them out with `@dagrejs/dagre`, rendered by
  `@xyflow/react`, replacing the hand-rolled topological layout + SVG Bézier edge
  engine.
- ~~**DataTable → `@tanstack/react-table`**~~. Done: `DataTable` now renders via
  `useReactTable` + `flexRender`, consumers use native `ColumnDef<T>` (classes on
  `meta`), and a client-side column-visibility menu was added. Backend-driven
  search/pagination/filters and the `Set`-based selection model were kept as-is;
  sorting/virtualization remain future work.
- ~~**Lightbox gallery → `yet-another-react-lightbox`**~~. Done for the
  prev/next/zoom slice of `src/components/grid-lightbox.tsx`. The comparison slider
  and embedded rating/evaluation forms stay custom.

## Deferred Tier 2 items

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

## Intentionally kept hand-rolled

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
