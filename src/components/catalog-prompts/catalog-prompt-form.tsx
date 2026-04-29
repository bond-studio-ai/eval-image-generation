'use client';

import { PageHeader, PrimaryButton } from '@/components/page-header';
import { ErrorCard } from '@/components/resource-form-header';
import { SearchableSelect } from '@/components/searchable-select';
import type { PromptKind, PromptVersion } from '@/lib/catalog-feed-client';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

const KIND_OPTIONS: { value: PromptKind; label: string }[] = [
  { value: 'generation', label: 'Generation' },
  { value: 'judge', label: 'Judge' },
  { value: 'extraction', label: 'Extraction' },
  { value: 'meta', label: 'Meta' },
];

const KIND_LABEL_MAP: Record<PromptKind, string> = Object.fromEntries(
  KIND_OPTIONS.map((o) => [o.value, o.label]),
) as Record<PromptKind, string>;

export interface ScopeOption {
  kind: PromptKind;
  scope: string;
}

interface CatalogPromptFormProps {
  mode: 'new' | 'new-version';
  parent: PromptVersion | null;
  availableScopes: ScopeOption[];
  loadError: string | null;
}

/**
 * CatalogPromptForm is the shared client form behind both the "New
 * prompt" and "Propose new version" entry points.
 *
 * - `mode="new"` lets the reviewer pick any (kind, scope) — including
 *   brand-new ones — to seed a proposal that will replace the active
 *   row at the next approve.
 * - `mode="new-version"` locks kind+scope to the parent row and
 *   prefills the template/rationale so the reviewer only edits the
 *   diff. The parent prompt id is forwarded to the upstream service
 *   via `parentId`, which is what the admin API uses to chain the
 *   propose -> approve audit history.
 *
 * The `kind` and `scope` controls share the SearchableSelect
 * primitive so the styling is consistent with the list page filter
 * row. Free text is allowed on `scope` so a proposer can introduce a
 * new scope, while `kind` is a fixed enum.
 */
export function CatalogPromptForm({
  mode,
  parent,
  availableScopes,
  loadError,
}: CatalogPromptFormProps) {
  const { user } = useUser();
  const router = useRouter();
  const isNewVersion = mode === 'new-version' && parent !== null;

  const [kind, setKind] = useState<PromptKind>(parent?.kind ?? 'generation');
  const [scope, setScope] = useState(parent?.scope ?? '');
  const [template, setTemplate] = useState(parent?.template ?? '');
  const [rationale, setRationale] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scopeOptions = useMemo(() => {
    const seen = new Set<string>();
    const out: { value: string }[] = [];
    for (const opt of availableScopes) {
      if (opt.kind !== kind) continue;
      if (seen.has(opt.scope)) continue;
      seen.add(opt.scope);
      out.push({ value: opt.scope });
    }
    return out.sort((a, b) => a.value.localeCompare(b.value));
  }, [availableScopes, kind]);

  const createdBy = user?.primaryEmailAddress?.emailAddress ?? user?.id ?? '';

  const canSubmit = scope.trim() && template.trim() && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/catalog-feed/admin/prompts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          kind,
          scope: scope.trim(),
          template,
          rationale: rationale.trim() || undefined,
          createdBy: createdBy || undefined,
          parentId: isNewVersion && parent ? parent.id : undefined,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`${res.status}: ${text.slice(0, 300)}`);
      }
      router.push('/catalog-prompts');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSubmitting(false);
    }
  }

  const title = isNewVersion ? 'Propose New Version' : 'New Prompt';
  const subtitle = isNewVersion
    ? `Replace the active ${KIND_LABEL_MAP[parent!.kind]} prompt for ${parent!.scope}. Once Evals passes, an admin promotes this proposal to active.`
    : 'Propose a new prompt version. Proposals start with status=proposed and remain inert until promoted.';

  return (
    <div className="flex flex-col">
      <PageHeader
        backHref="/catalog-prompts"
        backLabel="Back to Catalog Prompts"
        title={title}
        subtitle={subtitle}
        actions={
          <PrimaryButton onClick={handleSubmit} disabled={!canSubmit} loading={submitting}>
            {submitting ? 'Submitting…' : 'Submit Proposal'}
          </PrimaryButton>
        }
      />

      {loadError && (
        <div className="mt-4">
          <ErrorCard message={`Failed to load existing scopes: ${loadError}`} />
        </div>
      )}
      {error && (
        <div className="mt-4">
          <ErrorCard message={error} />
        </div>
      )}

      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-5 shadow-xs">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Kind <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              options={KIND_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              value={kind}
              onChange={(v) => {
                if (isNewVersion) return;
                setKind(v as PromptKind);
                setScope('');
              }}
              disabled={isNewVersion}
              ariaLabel="Prompt kind"
            />
            {isNewVersion && (
              <p className="mt-1 text-[11px] text-gray-500">
                Locked to the parent prompt&apos;s kind.
              </p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Scope <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              options={scopeOptions.map((o) => ({ value: o.value }))}
              value={scope}
              onChange={isNewVersion ? () => {} : setScope}
              disabled={isNewVersion}
              allowCustom={!isNewVersion}
              ariaLabel="Prompt scope"
              placeholder={
                scopeOptions.length > 0
                  ? `e.g. ${scopeOptions[0].value} — or type a new scope`
                  : 'tear_sheet:faucets'
              }
              emptyMessage="No matching scopes — type to create."
            />
            {isNewVersion ? (
              <p className="mt-1 text-[11px] text-gray-500">
                Locked to the parent prompt&apos;s scope.
              </p>
            ) : (
              scopeOptions.length > 0 && (
                <p className="mt-1 text-[11px] text-gray-500">
                  {scopeOptions.length} existing {KIND_LABEL_MAP[kind]} scope
                  {scopeOptions.length === 1 ? '' : 's'} — or type a new one.
                </p>
              )
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-wide text-gray-900 uppercase">
            Template <span className="text-red-500">*</span>
          </h2>
          <p className="text-[11px] text-gray-500">
            Go <code>text/template</code> syntax (<code>{'{{.Field}}'}</code>) — the worker
            renders this against typed context (
            <code>GenerationData</code>, <code>JudgeData</code>, etc.).
          </p>
        </div>
        <textarea
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          rows={20}
          spellCheck={false}
          className="mt-3 w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-xs text-gray-900 shadow-xs focus:border-primary-500 focus:ring-primary-500 focus:outline-none focus:ring-1"
          placeholder="The full prompt template as it will be sent to the model…"
        />
      </div>

      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-5 shadow-xs">
        <label className="block text-sm font-medium text-gray-700">
          Rationale <span className="text-xs font-normal text-gray-500">(optional)</span>
        </label>
        <textarea
          value={rationale}
          onChange={(e) => setRationale(e.target.value)}
          rows={3}
          className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-xs focus:border-primary-500 focus:ring-primary-500 focus:outline-none focus:ring-1"
          placeholder={
            isNewVersion
              ? 'Why is this proposal better than the active prompt?'
              : 'Why are we adding this scope or kind?'
          }
        />
        {createdBy && (
          <p className="mt-2 text-[11px] text-gray-500">Proposing as {createdBy}</p>
        )}
      </div>

      {isNewVersion && parent && (
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-5 shadow-xs">
          <h2 className="text-sm font-semibold tracking-wide text-gray-900 uppercase">
            Parent prompt
          </h2>
          <p className="mt-1 text-[11px] text-gray-500">
            For reference. Edits above replace the active row at the next approve.
          </p>
          <pre className="mt-3 max-h-72 overflow-auto rounded bg-gray-50 p-3 font-mono text-[11px] text-gray-700">
            {parent.template}
          </pre>
        </div>
      )}
    </div>
  );
}
