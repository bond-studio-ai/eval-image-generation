# Frontend Patterns

The visual system is documented in [DESIGN_TOKENS.md](DESIGN_TOKENS.md). The conventions below are runtime patterns — what to import, where to put data fetching, how to wire feedback.

## Page Layout

Pages render inside `AppShell` (sidebar + sticky top bar with breadcrumbs). Do not add page-level max-width wrappers or body scrolling. Use `PageHeader` for page titles, subtitles, back links, and primary actions.

```tsx
import { PageHeader } from '@/components/page-header';
import { LinkButton } from '@/components/ui/button';
import { PlusIcon } from '@/components/ui/icons';

<PageHeader
  title="Strategies"
  subtitle="Multi-step workflows that chain generations together."
  actions={
    <LinkButton href="/strategies/new" iconLeft={<PlusIcon className="h-4 w-4" />}>
      New Strategy
    </LinkButton>
  }
/>;
```

## UI Primitives

All shared UI primitives live in `src/components/ui/`. Import each one directly from its own module — there is no barrel; import the thing from where it lives.

```ts
import { Badge } from '@/components/ui/badge';
import { Button, LinkButton } from '@/components/ui/button';
import { Card, StatCard } from '@/components/ui/card';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { FilterBar, FilterSearch } from '@/components/ui/filter-bar';
import { FormSection } from '@/components/ui/form-section';
import { IconButton } from '@/components/ui/icon-button';
// icons: curated, aliased lucide re-exports
import { PlusIcon, TrashIcon } from '@/components/ui/icons';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Spinner } from '@/components/ui/spinner';
import { Tabs } from '@/components/ui/tabs';
import { toast } from '@/components/ui/toaster';
```

See [.cursor/rules/ui-conventions.mdc](../.cursor/rules/ui-conventions.mdc) for the full mapping of intent → primitive.

## Resource Forms

Create/edit pages should use this order:

1. `PageHeader` with save action in `actions`
2. `ResourceFormHeader` for name/description
3. `ErrorCard` for form-level errors
4. One or more `FormSection` blocks for sub-areas (settings, steps, judges, etc.)

```tsx
<PageHeader title="New Strategy" actions={<Button onClick={save} loading={saving}>Save</Button>} />
<ResourceFormHeader name={name} onNameChange={setName} description={desc} onDescriptionChange={setDesc} />
{error && <div className="mt-4"><ErrorCard message={error} /></div>}
<div className="mt-6 space-y-6">
  <FormSection title="Settings" description="Used by all steps">…</FormSection>
  <FormSection title="Preview Generation">…</FormSection>
</div>
```

Avoid raw red text for form failures when `ErrorCard` fits.

## Tables And Lists

Use `DataTable` for tabular list views. Pair it with:

- `useInfiniteList` for backend-powered search/pagination
- `SearchBar`, `SelectAllCheckbox`, and filter controls in the toolbar
- `Pagination` in the footer for paginated resources
- `BulkDeleteBar` for selection actions
- `checkboxColumn`, `actionsColumn`, `NameCell`, `StatusBadge`, and `DateCell`

`actionsColumn` renders icon buttons via `IconButton` under the hood and uses lucide icons (`clone`/`delete`/`edit`).

For non-tabular lists (custom card layouts like the Executions batch tab), keep the layout custom but use `Card`, `Badge`, `IconButton`, `Button`, and `SegmentedControl` so the visual language stays consistent.

## Feedback

Surface action results with toasts:

```tsx
import { toast } from '@/components/ui/toaster';

try {
  const res = await fetch(...);
  if (!res.ok) {
    toast.error('Failed to delete strategy', { description: `Server responded ${res.status}.` });
    return;
  }
  toast.success('Strategy deleted');
  refresh();
} catch (e) {
  toast.error('Failed to delete strategy', {
    description: e instanceof Error ? e.message : undefined,
  });
}
```

Replace `window.confirm()` with the styled dialog:

```tsx
import { useConfirm } from '@/components/ui/confirm-dialog';

const confirm = useConfirm();
const ok = await confirm({
  title: 'Delete strategy?',
  description: 'This will soft-delete the strategy.',
  confirmLabel: 'Delete strategy',
  tone: 'danger',
});
if (!ok) return;
```

Never silently `catch { /* ignore */ }` a mutation failure — at minimum, fire `toast.error()`.

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

Client mutation flows should surface actionable errors with `ErrorCard` or `toast.error()` instead of silently swallowing failed responses.

## Large Components

When a component grows beyond a single concern, extract in this order:

1. Pure derivation helpers in `src/lib` with tests
2. Feature hooks for fetch/poll/mutation state
3. Presentational subcomponents for repeated sections

Avoid moving code purely for file-size optics; extract around behavior that can be named and tested.
