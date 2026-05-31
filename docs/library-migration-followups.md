# Library migration — follow-up work

This note tracks the deliberately deferred parts of the "replace hand-rolled code
with libraries" effort. Tier 1 (low-risk drop-ins) and most of Tier 2 (medium
refactors) shipped on the `chore/use-libraries` branch. The items below were left
out on purpose, each for a concrete reason — they are not oversights.

## Tier 3 — larger rewrites (not yet started)

Deferred because the LOC savings are marginal relative to the migration risk, and
each warrants its own focused, visually-verified PR.

- **Prompt template editor → CodeMirror 6** (`@uiw/react-codemirror` +
  `@codemirror/lang-handlebars`). Would replace the transparent-textarea overlay
  editor, the regex syntax highlighter (`src/lib/highlight-handlebars.tsx`), and
  the custom Handlebars validator (`src/lib/validate-handlebars.ts`, ~430 lines
  with UX-specific error messages that are unit-tested). The pixel-perfect
  textarea/overlay scroll-sync is the hard part CodeMirror solves natively. The
  three editor insert popovers (`reference`/`conditional`/`dollhouse`) would be
  folded into the same editor surface, which is why they were _not_ migrated to
  Radix Popover in Tier 2 (doing so would be throwaway work). The plain JSON
  `<textarea>` in `design-settings-editor.tsx` could move to
  `@codemirror/lang-json` in the same effort.
- **Strategy DAG → React Flow** (`@xyflow/react` + `@dagrejs/dagre`). Would
  replace the topological level layout + SVG Bézier edge engine in
  `src/components/strategy-flow-dag.tsx` with a real graph library + auto-layout.
- **DataTable → `@tanstack/react-table`**. Only worth it if/when client-side
  sorting, column visibility, or row virtualization is needed; today the
  `DataTable` wrapper is intentionally thin and backend-driven.
- **Lightbox gallery → `yet-another-react-lightbox`** for the prev/next/zoom slice
  of `src/components/grid-lightbox.tsx`. The comparison slider and embedded
  rating/evaluation forms stay custom.

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
