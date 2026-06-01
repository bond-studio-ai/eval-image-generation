# React Doctor — confirmed false positives

Diagnostics listed here have been reviewed and intentionally suppressed.
Each entry: `rule` — `path:line` (value) — reason.

## react-doctor/no-derived-state

- `react-doctor/no-derived-state` — `src/components/image-evaluation-form.tsx:134` (`data`) — seeds user-editable form state from the async evaluation fetch (gated by `loadedRef`); not a render-time derivation.
- `react-doctor/no-derived-state` — `src/components/date-range-picker.tsx:70` (`range`) — `range` is the user-editable calendar draft (edited via `DayPicker`'s `onSelect`); the effect re-seeds it from the `from`/`to` props so an externally-applied range stays reflected while the popover is open. It is editable state, not a pure render-time derivation. (Added during the `react-day-picker` migration.)

## react-doctor/no-derived-state-effect

- `react-doctor/no-derived-state-effect` — `src/components/date-range-picker.tsx:69` (`range`) — same effect as above: re-seeds the editable calendar draft from props. Cannot be replaced by a render-time `useMemo` because the value is user-editable between seeds.

## react-doctor/no-multi-comp

Tightly-coupled sub-components co-located with their primary, an accepted
pattern across the codebase. Splitting them into separate files would
over-fragment without improving clarity.

- `react-doctor/no-multi-comp` — `src/app/strategies/[id]/runs/[runId]/_components/audit.tsx:82`, `:101` (`AuditCollapsible`, `StepAudit`) — three tightly-coupled audit sub-components co-located in one file.
- `react-doctor/no-multi-comp` — `src/components/review-results/icons.tsx:19`, `:34` (`ChevronIcon`, `WarningIcon`) — tiny presentational icon helpers for the review-results surface.

## react-doctor/query-no-usequery-for-mutation

- `react-doctor/query-no-usequery-for-mutation` — `src/components/preview-prompt-page.tsx:222` (`previewQuery`) — the preview endpoint is a POST only because it takes a request body, but it is a **read** that auto-fetches declaratively whenever the selected prompt/preset/area change (true query semantics, keyed by those inputs). `useMutation` would force an imperative trigger and reintroduce effect-driven fetching, so `useQuery` is the correct model here.

## react-doctor/async-await-in-loop

Each loop awaits sequentially on purpose — either the iterations are
loop-carried (page N+1 needs page N's result) or already fanned out with
`Promise.allSettled`, or sequential execution is a deliberate rate-limit guard.

- `react-doctor/async-await-in-loop` — `src/app/api/v1/layout-presets/bootstrap/route.ts:68` — polling loop with `sleep` + a loop-carried counter; sequential is required.
- `react-doctor/async-await-in-loop` — `src/app/executions/_components/run-options.ts:19` — `do/while` pagination; page N+1 depends on `totalPages` from page N.
- `react-doctor/async-await-in-loop` — `src/app/executions/_components/run-options.ts:89` — awaits are inside a `.map(async …)` already passed to `Promise.allSettled`; already concurrent.
- `react-doctor/async-await-in-loop` — `src/app/executions/_components/run-options.ts:116` — same: `.map(async …)` inside `Promise.allSettled`.
- `react-doctor/async-await-in-loop` — `src/components/review-run-group-badge.tsx:150` — sequential is intentional; parallel was overloading the SAM upstream (rate-limit guard).

## react-doctor/async-defer-await

- `react-doctor/async-defer-await` — `src/app/dollhouse-renders/new/new-render-form.tsx:132` — the `if (controller.signal.aborted) return` guard reads abort state mutated _during_ the await; hoisting it before the await defeats the guard.

## react-doctor/no-event-handler

The flagged state is set by an external subscription (IntersectionObserver) or
the effect synchronizes state to an external system (the URL/history) — both
are documented legitimate `useEffect` uses, not event handlers that could be
collapsed into an `onClick`/`onChange`. (All introduced by the
`react-intersection-observer` / `@tanstack/react-query` migration.)

- `react-doctor/no-event-handler` — `src/app/executions/_components/use-batch-list-machinery.ts:19` (×2) — the effect fires `loadMore()` when the `react-intersection-observer` sentinel scrolls into view (`inView`). `inView` comes from the IntersectionObserver, which no event handler can observe — the rule's own documented false-positive case.
- `react-doctor/no-event-handler` — `src/hooks/use-infinite-list.ts:92`, `:98`, `:138` — the only effect in the hook mirrors `search`/`filters`/`page` into the URL via `window.history.replaceState` (synchronize-with-external-system). It serializes several state slices into one query string, so it can't be hoisted into the individual setters.

## react-doctor/exhaustive-deps

Intentional, documented dependency exclusions — adding the "missing" dep would
refetch/re-subscribe every render or defeat a stable-identity optimization.

- `react-doctor/exhaustive-deps` — `src/components/review-results/mask-preview.tsx:147` — depends on the derived `maskKey` string on purpose; adding raw `masks` would defeat the stable-identity repaint.

## react-doctor/no-array-index-key + react-doctor/no-array-index-as-key

Index keys are safe here: each list is a positionally-stable, stateless
render of a derived array (text segments) that is never reordered and whose
values can repeat, so no stable per-item id exists.

- `react-doctor/no-array-index-key` / `no-array-index-as-key` — `src/app/audit/compare/_components/diff-text.tsx:16` & `:26` — `<span>`s over `diffWords` segments; stateless text leaves.

## react-doctor/no-cascading-set-state

- `react-doctor/no-cascading-set-state` — `src/app/dollhouse-renders/[id]/render-auto-refresh.tsx:35` — the setters are independent timer-driven updates to disparate slices (`secondsLeft` countdown vs `refreshing` flash), not a coordinated cascade.

## react-doctor/no-derived-useState

- `react-doctor/no-derived-useState` — `src/components/design-settings-product-modal.tsx:40`, `:41`, `:42` — intentional uncontrolled "draft" modal: captures the initial prop values (`selectedId`, `imageTypeValue`, `arbitraryUrl`) once into editable draft state before Accept, and deliberately does **not** stay in sync with the props. (Extracted out of `design-settings-editor.tsx` during the lint refactor.)

## react-doctor/rendering-hydration-mismatch-time

- `react-doctor/rendering-hydration-mismatch-time` — `src/components/date-range-picker.tsx:137` (`new Date()`) — the `DayPicker`'s `defaultMonth={range?.from ?? new Date()}` only renders inside the `{showCustom && …}` popover, and `showCustom` starts `false`, so the calendar never renders during SSR/first hydration — it only mounts after a client click. No server/client divergence is possible.

## react-doctor/prefer-dynamic-import

- `react-doctor/prefer-dynamic-import` — `src/app/analytics/accuracy-trend-chart-graph.tsx:3` — the parent (`accuracy-trend-chart.tsx`) already wraps this leaf in `dynamic(() => import('./accuracy-trend-chart-graph'))`; recharts is already code-split.
- `react-doctor/prefer-dynamic-import` — `src/app/analytics/reliability-trend-chart-graph.tsx:3` — the parent (`reliability-tab.tsx`) wraps this leaf in `dynamic(() => import('./reliability-trend-chart-graph'), { ssr: false })`; recharts is already code-split out of the initial bundle.
- `react-doctor/prefer-dynamic-import` — `src/components/prompt-template-editor/template-code-editor.tsx:4` (`@codemirror/view`) — reached only through the `prompt-code-editor`/`json-code-editor` wrappers, which `prompt-template-editor.tsx` and `design-settings-editor.tsx` load via `dynamic(() => import(...), { ssr: false })`; CodeMirror is already code-split out of the initial bundle.
- `react-doctor/prefer-dynamic-import` — `src/components/prompt-template-editor/editor-theme.ts:1` (`@codemirror/view`) — same: only imported by the dynamically-loaded CodeMirror editor wrappers, so CodeMirror stays out of the initial bundle.

## react-doctor/prefer-tag-over-role

The suggested native swap is invalid or impossible at each site — the role
sits on an element nested inside a real `<button>` (button-in-button is invalid
HTML), maps to a void element that can't host the existing children/interactivity,
or maps to a semantically-wrong tag.

- `react-doctor/prefer-tag-over-role` — `src/app/strategies/[id]/runs-list.tsx:254`, `:268`, `:344`, `:358` — `role="button"` spans nested inside the card's real expand `<button>`; swapping nests `<button>` in `<button>`.
- `react-doctor/prefer-tag-over-role` — `src/app/strategies/[id]/runs-list-matrix.tsx:96` — `role="button"` div is a clickable result-thumbnail cell with nested interactive descendants (`JudgeScoreBadge` + overlay); a native `<button>` would nest interactive content illegally. (Migrated out of `runs-list.tsx` during the lint refactor.)
- `react-doctor/prefer-tag-over-role` — `src/components/judge-score-badge.tsx:279`, `:308` — this shared badge also renders inside a real `<button>` in `batch-matrix-view.tsx`; a native `<button>` would nest button-in-button there.
- `react-doctor/prefer-tag-over-role` — `src/components/two-pane-split.tsx:124` — `role="separator"` maps to void `<hr>`, which can't carry the focusable/draggable resizer (`tabIndex`, pointer + key handlers, `aria-valuenow`).
- `react-doctor/prefer-tag-over-role` — `src/components/ui/tabs.tsx:111` — `role="group"`'s only native mapping the rule offers is `<address>`, which is semantically wrong for a view-switch tab strip.

## react-doctor/prefer-useReducer

Pure count heuristic (fires at >=5 useState in a component body). Each site
below either already extracts its genuinely-coordinated state into a reducer,
or holds independent unrelated slices — the rule explicitly says to leave
those as their own `useState`.

- `react-doctor/prefer-useReducer` — `src/app/dollhouse-renders/new/new-render-form.tsx:80` — already uses `projectReducer`; the remaining useStates are independent config sections (image/render/ssm/style) + submit flags.
- `react-doctor/prefer-useReducer` — `src/app/audit/compare/_components/run-picker.tsx:77` — already uses `filtersReducer`; the rest are independent fetch/pagination and expansion slices.
- `react-doctor/prefer-useReducer` — `src/app/strategies/[id]/runs/[runId]/run-detail.tsx:51` — already uses `viewingPromptReducer`; the rest are independent display toggles, polled data, and per-action flags.
- `react-doctor/prefer-useReducer` — `src/app/strategies/strategies-table.tsx:23` — independent per-action loading flags (`deletingId`/`togglingId`/`cloningId`) + selection + filter; matches the DataTable convention.
- `react-doctor/prefer-useReducer` — `src/components/image-evaluation-form.tsx:71` — independent save-status, section open/close toggles, and form-data slices.
- `react-doctor/prefer-useReducer` — `src/components/strategy-builder.tsx:28` — independent form-section fields (name/description/settings/steps) + save flags.
