# Frontend Patterns

## Page Layout

Pages render inside `AppShell`; do not add page-level max-width wrappers or body scrolling. Use `PageHeader` for page titles, subtitles, back links, and primary actions.

```tsx
<PageHeader
  title="Strategies"
  subtitle="Multi-step workflows that chain generations together."
  actions={
    <PrimaryLinkButton href="/strategies/new" icon>
      New Strategy
    </PrimaryLinkButton>
  }
/>
```

## Resource Forms

Create/edit pages should use this order:

1. `PageHeader` with save action in `actions`
2. `ResourceFormHeader` for name/description
3. `ErrorCard` for form-level errors
4. Feature-specific fields

Avoid raw red text for form failures when `ErrorCard` fits.

## Tables And Lists

Use `DataTable` for tabular list views. Pair it with:

- `useInfiniteList` for backend-powered search/pagination
- `SearchBar`, `SelectAllCheckbox`, and filter controls in the toolbar
- `Pagination` in the footer for paginated resources
- `BulkDeleteBar` for selection actions
- `checkboxColumn`, `actionsColumn`, `NameCell`, `StatusBadge`, and `DateCell`

Infinite scroll or polling screens can still use `DataTable`; keep the custom loading sentinel or poll loop outside the table markup.

## Client Data Access

Client Components should use local URLs:

```ts
fetch(serviceUrl('strategies'));
fetch(localUrl('upload'));
```

Do not import server-only env helpers into client files.

## Server Data Access

Server Components and route handlers should use the server clients and env helpers under `src/lib`. Keep response normalization in typed helpers, not inline in pages.

## Proxies And Errors

Browser-accessed admin proxies must:

- check Clerk auth in the route handler
- use `proxyUpstream()` for consistent upstream behavior
- return structured `{ error: { code, message } }` envelopes on local failures

Client mutation flows should surface actionable errors with `ErrorCard` or an equivalent inline banner instead of silently swallowing failed responses.

## Large Components

When a component grows beyond a single concern, extract in this order:

1. Pure derivation helpers in `src/lib` with tests
2. Feature hooks for fetch/poll/mutation state
3. Presentational subcomponents for repeated sections

Avoid moving code purely for file-size optics; extract around behavior that can be named and tested.
