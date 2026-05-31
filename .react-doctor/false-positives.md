# React Doctor — confirmed false positives

Diagnostics listed here have been reviewed and intentionally suppressed.
Each entry: `rule` — `path:line` (value) — reason.

## react-doctor/no-derived-state

The `avoidSingleSetter` heuristic fires on any `fetch`-in-`useEffect` whose
setter inputs match the effect deps. In every case below the stored value is
the **async response** (or a DOM measurement / reset-on-refresh interaction
state), not a synchronous derivation of props/state — so it genuinely must
live in state and cannot be computed during render.

- `react-doctor/no-derived-state` — `src/app/analytics/accuracy-trend-chart.tsx:59` (`loading`) — async fetch status set in `finally`.
- `react-doctor/no-derived-state` — `src/app/analytics/reliability-tab.tsx:139` (`loading`) — async fetch status set in `finally`.
- `react-doctor/no-derived-state` — `src/app/strategies/[id]/strategy-performance.tsx:43` (`data`) — async fetch result.
- `react-doctor/no-derived-state` — `src/components/grid-lightbox.tsx:74` (`fetched`) — async fetch result.
- `react-doctor/no-derived-state` — `src/components/view-prompt-modal.tsx:43` (`loading`) — async fetch status.
- `react-doctor/no-derived-state` — `src/hooks/use-infinite-list.ts:215` (`paginating`) — async fetch status.
- `react-doctor/no-derived-state` — `src/components/strategy-hover-card.tsx:96` (`pos`) — post-layout `getBoundingClientRect` viewport clamp; needs the rendered node.
- `react-doctor/no-derived-state` — `src/components/image-evaluation-form.tsx:127` (`data`) — seeds user-editable form state from the async evaluation fetch (gated by `loadedRef`); not a render-time derivation.

## react-doctor/no-multi-comp

Tightly-coupled sub-components co-located with their primary, an accepted
pattern across the codebase. Splitting them into separate files would
over-fragment without improving clarity.

- `react-doctor/no-multi-comp` — `src/app/strategies/[id]/runs/[runId]/_components/audit.tsx` (`AuditCollapsible`, `StepAudit`) — three tightly-coupled audit sub-components co-located in one file.
- `react-doctor/no-multi-comp` — `src/components/review-results/icons.tsx` (`ChevronIcon`, `WarningIcon`) — tiny presentational icon helpers for the review-results surface.

## react-doctor/query-no-usequery-for-mutation

- `react-doctor/query-no-usequery-for-mutation` — `src/components/preview-prompt-page.tsx:209` (`previewQuery`) — the preview endpoint is a POST only because it takes a request body, but it is a **read** that auto-fetches declaratively whenever the selected prompt/preset/area change (true query semantics, keyed by those inputs). `useMutation` would force an imperative trigger and reintroduce effect-driven fetching, so `useQuery` is the correct model here.

## react-doctor/async-await-in-loop

Each loop awaits sequentially on purpose — either the iterations are
loop-carried (page N+1 needs page N's result) or already fanned out with
`Promise.allSettled`, or sequential execution is a deliberate rate-limit guard.

- `react-doctor/async-await-in-loop` — `src/app/api/v1/layout-presets/bootstrap/route.ts:63` — polling loop with `sleep` + a loop-carried counter; sequential is required.
- `react-doctor/async-await-in-loop` — `src/app/executions/_components/run-options.ts:18` — `do/while` pagination; page N+1 depends on `totalPages` from page N.
- `react-doctor/async-await-in-loop` — `src/app/executions/_components/run-options.ts:88` — awaits are inside a `.map(async …)` already passed to `Promise.allSettled`; already concurrent.
- `react-doctor/async-await-in-loop` — `src/app/executions/_components/run-options.ts:115` — same: `.map(async …)` inside `Promise.allSettled`.
- `react-doctor/async-await-in-loop` — `src/components/review-run-group-badge.tsx:127` — sequential is intentional; parallel was overloading the SAM upstream (rate-limit guard).

## react-doctor/async-defer-await

- `react-doctor/async-defer-await` — `src/app/dollhouse-renders/new/new-render-form.tsx:122` — the `if (controller.signal.aborted) return` guard reads abort state mutated _during_ the await; hoisting it before the await defeats the guard.

## react-doctor/exhaustive-deps

Intentional, documented dependency exclusions — adding the "missing" dep would
refetch/re-subscribe every render or defeat a stable-identity optimization.

- `react-doctor/exhaustive-deps` — `src/components/review-results/mask-preview.tsx:131` — depends on the derived `maskKey` string on purpose; adding raw `masks` would defeat the stable-identity repaint.
- `react-doctor/exhaustive-deps` — `src/components/strategy-hover-card.tsx:77` — cleanup-only effect reads only `timeoutRef.current`; `[]` is correct (a ref is not a reactive dep).
- `react-doctor/exhaustive-deps` — `src/components/ui/modal.tsx:130` — intentional mount/unmount-only effect (`onClose` via ref, stable `initialFocusRef`).
- `react-doctor/exhaustive-deps` — `src/hooks/use-infinite-list.ts:208` — intentional exclusion of raw `staticParams` in favor of the stable `staticParamsKey`; including it would refetch every render.

## react-doctor/no-array-index-key + react-doctor/no-array-index-as-key

Index keys are safe here: each list is a positionally-stable, stateless
render of a derived array (text segments, fixed column config) that is
never reordered and whose values can repeat, so no stable per-item id
exists.

- `react-doctor/no-array-index-key` / `no-array-index-as-key` — `src/app/audit/compare/_components/diff-text.tsx:15` & `:24` — `<span>`s over `diffWords` segments; stateless text leaves.
- `react-doctor/no-array-index-key` / `no-array-index-as-key` — `src/components/data-table.tsx:71` & `:90` — `<th>`/`<td>` over the static `columns` config prop; fixed definitions, never reordered.

## react-doctor/no-cascading-set-state

- `react-doctor/no-cascading-set-state` — `src/app/dollhouse-renders/[id]/render-auto-refresh.tsx:34` — the setters are independent timer-driven updates to disparate slices (`secondsLeft` countdown vs `refreshing` flash), not a coordinated cascade.

## react-doctor/no-derived-useState

- `react-doctor/no-derived-useState` — `src/components/design-settings-editor.tsx:890`, `:891`, `:892` — intentional uncontrolled "draft" modal: captures the initial prop values once into editable draft state before Accept, and deliberately does **not** stay in sync with the props.

## react-doctor/no-event-handler

- `react-doctor/no-event-handler` — `src/components/grid-lightbox.tsx:74` — effect fetches generation data from the server when the `generationId` prop changes; genuine async/external-data sync, not an event-handler side effect.
- `react-doctor/no-event-handler` — `src/components/strategy-hover-card.tsx:89` — post-render layout-sync effect measuring the portal card via `getBoundingClientRect`; the card only exists once open, so it can't move into the hover handler.

## react-doctor/no-pass-live-state-to-parent

- `react-doctor/no-pass-live-state-to-parent` — `src/hooks/use-infinite-list.ts:215` — `fetchPage` is a local `useCallback`, not a parent/prop callback, and `startPage` comes from a ref, not live state.

## react-doctor/prefer-dynamic-import

- `react-doctor/prefer-dynamic-import` — `src/app/analytics/accuracy-trend-chart-graph.tsx:3` — the parent (`accuracy-trend-chart.tsx`) already wraps this leaf in `dynamic(() => import('./accuracy-trend-chart-graph'))`; recharts is already code-split.

## react-doctor/prefer-tag-over-role

The suggested native swap is invalid or impossible at each site — the role
sits on an element nested inside a real `<button>` (button-in-button is invalid
HTML), maps to a void element that can't host the existing children/interactivity,
or maps to a semantically-wrong tag.

- `react-doctor/prefer-tag-over-role` — `src/app/strategies/[id]/runs-list.tsx:278`, `:292`, `:408`, `:422` — `role="button"` spans nested inside the card's real expand `<button>`; swapping nests `<button>` in `<button>`.
- `react-doctor/prefer-tag-over-role` — `src/app/strategies/[id]/runs-list.tsx:531` — `role="button"` div wraps interactive descendants (a `JudgeScoreBadge` button + rating overlay), illegal inside a native `<button>`.
- `react-doctor/prefer-tag-over-role` — `src/components/judge-score-badge.tsx:274`, `:295` — this shared badge also renders inside a real `<button>` in `batch-matrix-view.tsx`; a native `<button>` would nest button-in-button there.
- `react-doctor/prefer-tag-over-role` — `src/components/comparison-slider.tsx:77` — `role="slider"` maps to void `<input>`, which can't host the slider's image/label/bar children or its drag + keyboard handlers.
- `react-doctor/prefer-tag-over-role` — `src/components/two-pane-split.tsx:111` — `role="separator"` maps to void `<hr>`, which can't carry the focusable/draggable resizer (`tabIndex`, pointer + key handlers, `aria-valuenow`).
- `react-doctor/prefer-tag-over-role` — `src/components/ui/tabs.tsx:111` — `role="group"`'s only native mapping the rule offers is `<address>`, which is semantically wrong for a view-switch tab strip.

## react-doctor/prefer-useReducer

Pure count heuristic (fires at >=5 useState in a component body). Each site
below either already extracts its genuinely-coordinated state into a reducer,
or holds independent unrelated slices — the rule explicitly says to leave
those as their own `useState`.

- `react-doctor/prefer-useReducer` — `src/app/dollhouse-renders/new/new-render-form.tsx:70` — already uses `projectReducer`; the remaining useStates are independent config sections (image/render/ssm/style) + submit flags.
- `react-doctor/prefer-useReducer` — `src/app/audit/compare/_components/run-picker.tsx:61` — already uses `filtersReducer`; the rest are independent fetch/pagination and expansion slices.
- `react-doctor/prefer-useReducer` — `src/app/strategies/[id]/runs/[runId]/run-detail.tsx:43` — already uses `viewingPromptReducer`; the rest are independent display toggles, polled data, and per-action flags.
- `react-doctor/prefer-useReducer` — `src/app/strategies/strategies-table.tsx:16` — independent per-action loading flags (`deletingId`/`togglingId`/`cloningId`) + selection + filter; matches the DataTable convention.
- `react-doctor/prefer-useReducer` — `src/components/image-evaluation-form.tsx:60` — independent save-status, section open/close toggles, and form-data slices.
- `react-doctor/prefer-useReducer` — `src/components/strategy-builder.tsx:26` — independent form-section fields (name/description/settings/steps) + save flags.
