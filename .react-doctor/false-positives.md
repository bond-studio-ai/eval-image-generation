# React Doctor — confirmed false positives

Diagnostics listed here have been reviewed and intentionally suppressed.
Each entry: `rule` — `path:line` (value) — reason.

## react-doctor/no-derived-state

The `avoidSingleSetter` heuristic fires on any `fetch`-in-`useEffect` whose
setter inputs match the effect deps. In every case below the stored value is
the **async response** (or a DOM measurement / reset-on-refresh interaction
state), not a synchronous derivation of props/state — so it genuinely must
live in state and cannot be computed during render.

- `react-doctor/no-derived-state` — `src/app/analytics/accuracy-trend-chart.tsx:62` (`loading`) — async fetch status set in `finally`.
- `react-doctor/no-derived-state` — `src/app/analytics/reliability-tab.tsx:172` (`loading`) — async fetch status set in `finally`.
- `react-doctor/no-derived-state` — `src/app/audit/compare/compare-view.tsx:350` (`error`) — set in fetch `catch`.
- `react-doctor/no-derived-state` — `src/app/audit/compare/single-run-audit-view.tsx:182` (`error`) — set in fetch `catch`.
- `react-doctor/no-derived-state` — `src/app/strategies/[id]/strategy-performance.tsx:43` (`data`) — async fetch result.
- `react-doctor/no-derived-state` — `src/components/grid-lightbox.tsx:66` (`fetched`) — async fetch result.
- `react-doctor/no-derived-state` — `src/components/preview-prompt-page.tsx:381` (`previews`) — async POST result.
- `react-doctor/no-derived-state` — `src/components/view-prompt-modal.tsx:48` (`loading`) — async fetch status.
- `react-doctor/no-derived-state` — `src/hooks/use-infinite-list.ts:219` (`paginating`) — async fetch status.
- `react-doctor/no-derived-state` — `src/app/executions/batch-tab.tsx:334` (`expandedIds`) — user expand/collapse state reset on refresh; not derivable during render.
- `react-doctor/no-derived-state` — `src/components/strategy-hover-card.tsx:104` (`pos`) — post-layout `getBoundingClientRect` viewport clamp; needs the rendered node.

## react-doctor/query-no-usequery-for-mutation

- `react-doctor/query-no-usequery-for-mutation` — `src/components/preview-prompt-page.tsx:259` (`previewQuery`) — the preview endpoint is a POST only because it takes a request body, but it is a **read** that auto-fetches declaratively whenever the selected prompt/preset/area change (true query semantics, keyed by those inputs). `useMutation` would force an imperative trigger and reintroduce effect-driven fetching, so `useQuery` is the correct model here.
