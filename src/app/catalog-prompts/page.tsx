import { formatDateTime, PromptStatusBadge } from '@/components/catalog-confidence/badges';
import { PageHeader } from '@/components/page-header';
import { fetchAdminPrompts, type PromptKind } from '@/lib/catalog-feed-client';
import Link from 'next/link';
import { PromptActions } from './prompt-actions';
import { ProposePromptForm, type ScopeOption } from './propose-form';
import { ScopeFilterInput } from './scope-filter-input';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ kind?: string; scope?: string }>;
}

const KIND_OPTIONS: { value: PromptKind | ''; label: string }[] = [
  { value: '', label: 'All kinds' },
  { value: 'generation', label: 'Generation' },
  { value: 'judge', label: 'Judge' },
  { value: 'extraction', label: 'Extraction' },
  { value: 'meta', label: 'Meta' },
];

export default async function CatalogPromptsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const kind = (sp.kind as PromptKind) || '';
  const scope = sp.scope ?? '';

  let rows: Awaited<ReturnType<typeof fetchAdminPrompts>> = [];
  let allRows: Awaited<ReturnType<typeof fetchAdminPrompts>> = [];
  let error: string | null = null;
  let scopeOptionsError: string | null = null;
  const [tableResult, scopeOptionsResult] = await Promise.allSettled([
    fetchAdminPrompts({ kind, scope }),
    fetchAdminPrompts({}),
  ]);
  if (tableResult.status === 'fulfilled') {
    rows = tableResult.value;
  } else {
    error = tableResult.reason instanceof Error ? tableResult.reason.message : String(tableResult.reason);
  }
  if (scopeOptionsResult.status === 'fulfilled') {
    allRows = scopeOptionsResult.value;
  } else {
    scopeOptionsError =
      scopeOptionsResult.reason instanceof Error
        ? scopeOptionsResult.reason.message
        : String(scopeOptionsResult.reason);
  }

  const availableScopes: ScopeOption[] = allRows.map((p) => ({ kind: p.kind, scope: p.scope }));
  const kindSelectId = 'catalog-prompts-kind-filter';

  return (
    <div>
      <PageHeader
        title="Catalog Confidence — Prompts"
        subtitle="Propose, review, and promote prompt versions. Active prompts are the ones the worker attributes AI runs to; proposals are promoted only after the Evals regression gate passes."
      />

      <form
        method="get"
        className="mt-6 grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-xs md:grid-cols-4"
      >
        <label className="text-xs font-medium text-gray-600">
          Kind
          <select
            id={kindSelectId}
            name="kind"
            defaultValue={kind}
            className="focus:border-primary-500 focus:ring-primary-500 mt-1 w-full rounded-md border-gray-300 px-2 py-1 text-sm text-gray-900 shadow-xs"
          >
            {KIND_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-gray-600 md:col-span-2">
          Scope
          <ScopeFilterInput
            // Initial render uses the URL-bound defaultValue so the page
            // is still SSR-friendly. Once mounted, the client component
            // narrows suggestions by the kind selected on this same form
            // (read live from the DOM) so switching kind <-> scope is
            // a single fluid interaction.
            defaultValue={scope}
            availableScopes={availableScopes}
            initialKind={kind}
            kindSelectId={kindSelectId}
          />
        </label>
        <div className="flex items-end">
          <button
            type="submit"
            className="bg-primary-600 hover:bg-primary-700 w-full rounded-md px-3 py-1.5 text-sm font-medium text-white shadow-xs"
          >
            Apply
          </button>
        </div>
      </form>

      {error && (
        <div className="mt-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Failed to load prompts: {error}
        </div>
      )}
      {scopeOptionsError && !error && (
        <div className="mt-6 rounded-md border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
          Prompt rows loaded, but scope suggestions could not be loaded: {scopeOptionsError}
        </div>
      )}

      <div className="mt-6 overflow-clip rounded-lg border border-gray-200 bg-white shadow-xs">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-600 uppercase">
                Kind
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-600 uppercase">
                Scope
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-600 uppercase">
                Status
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-600 uppercase">
                Created
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-600 uppercase">
                By
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-600 uppercase">
                Rationale &amp; template
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-600 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.length === 0 && !error && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
                  No prompts match the current filters.
                </td>
              </tr>
            )}
            {rows.map((p) => (
              <tr key={p.id} className="align-top hover:bg-gray-50">
                <td className="px-4 py-2 text-sm text-gray-900">{p.kind}</td>
                <td className="px-4 py-2 text-sm text-gray-900">{p.scope}</td>
                <td className="px-4 py-2">
                  <PromptStatusBadge status={p.status} />
                </td>
                <td className="px-4 py-2 text-xs text-gray-700">{formatDateTime(p.createdAt)}</td>
                <td className="px-4 py-2 text-xs text-gray-700">{p.createdBy}</td>
                <td className="max-w-xs px-4 py-2 text-xs text-gray-700">
                  <details>
                    <summary className="cursor-pointer text-gray-700">
                      {p.rationale
                        ? p.rationale.slice(0, 60) + (p.rationale.length > 60 ? '…' : '')
                        : '—'}
                    </summary>
                    <div className="mt-2 space-y-2">
                      <div>
                        <div className="text-[11px] font-semibold tracking-wide text-gray-500 uppercase">
                          Full rationale
                        </div>
                        <p className="mt-1 text-xs whitespace-pre-wrap text-gray-700">
                          {p.rationale || '—'}
                        </p>
                      </div>
                      <div>
                        <div className="text-[11px] font-semibold tracking-wide text-gray-500 uppercase">
                          Template preview
                        </div>
                        <pre className="mt-1 max-h-72 overflow-auto rounded bg-gray-50 p-2 text-xs">
                          {p.template}
                        </pre>
                      </div>
                    </div>
                  </details>
                </td>
                <td className="px-4 py-2 text-xs">
                  <PromptActions id={p.id} status={p.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8 rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
        <h2 className="text-sm font-semibold tracking-wide text-gray-600 uppercase">
          Propose new prompt version
        </h2>
        <p className="mt-1 text-xs text-gray-500">
          Proposals are inserted with <code>status=proposed</code> and remain inert until the Evals
          regression gate passes and an admin approves them. See{' '}
          <Link
            className="text-primary-700 hover:underline"
            href="/catalog-prompts?kind=judge&scope=tear_sheet"
          >
            an active example
          </Link>
          .
        </p>
        <ProposePromptForm availableScopes={availableScopes} />
      </div>
    </div>
  );
}
