'use client';

import { PageHeader, PrimaryButton } from '@/components/page-header';
import { ErrorCard } from '@/components/resource-form-header';
import { SearchableSelect } from '@/components/searchable-select';
import type { PromptKind, PromptVersion } from '@/lib/catalog-feed-client';
import {
  decodePromptTemplate,
  encodePromptTemplate,
  variablesForPrompt,
} from '@/lib/prompt-template-format';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { PromptTemplateDisplay } from './prompt-template-display';
import { PromptTemplateEditor } from './prompt-template-editor';

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
  // Decode the parent template once into its (system, user) parts so
  // the editor can show two human-readable panels even when the row
  // predates the JSON envelope format. Plain-text legacy rows land in
  // the user side with system left empty (matches the resolver's
  // backward-compat handling in service-catalog-feed).
  const initialEnvelope = useMemo(
    () => decodePromptTemplate(parent?.template ?? ''),
    [parent?.template],
  );
  const [systemTemplate, setSystemTemplate] = useState(initialEnvelope.system);
  const [userTemplate, setUserTemplate] = useState(initialEnvelope.user);
  const [rationale, setRationale] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Variables surface differently per (kind, scope): generation/judge
  // expose typed worker structs, extraction prompts split between
  // style (aidomain.Context) and procedural (ProceduralContext).
  // Recomputed every render but the underlying call returns a stable
  // module-level array, so React still bails out on identity checks.
  const variables = useMemo(() => variablesForPrompt(kind, scope), [kind, scope]);

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

  // The submit gate requires at least the user side. System is
  // optional (some prompts ship a single user-only instruction) but
  // an entirely empty pair is a no-op that the worker cannot use.
  const canSubmit = scope.trim() && userTemplate.trim() && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      // Re-encode the (system, user) pair into the JSON envelope the
      // backend round-trips through prompt_versions.template. Doing
      // this on submit (rather than on every keystroke) keeps the
      // textarea state plain strings and avoids burying the
      // operator's edits inside JSON syntax mid-edit.
      const template = encodePromptTemplate(systemTemplate, userTemplate);
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

      <div className="mt-6 space-y-6 rounded-lg border border-gray-200 bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-wide text-gray-900 uppercase">
            Template <span className="text-red-500">*</span>
          </h2>
          <p className="text-[11px] text-gray-500">
            Go <code>text/template</code> syntax (<code>{'{{.Field}}'}</code>) — the worker
            renders this against typed context (
            <code>{kindContextLabel(kind, scope)}</code>). Use the{' '}
            <strong>Insert variable</strong> dropdown to add a typed reference.
          </p>
        </div>

        <PromptTemplateEditor
          label="System prompt"
          value={systemTemplate}
          onChange={setSystemTemplate}
          variables={variables}
          rows={6}
          hint="Sent as the system message — sets the model's role and output contract. Optional."
          placeholder="You are a strict extractor for…"
        />

        <PromptTemplateEditor
          label="User prompt"
          value={userTemplate}
          onChange={setUserTemplate}
          variables={variables}
          rows={14}
          required
          hint="Sent as the user message — describes the task and references the typed values."
          placeholder="Given this product image, …"
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
        <ParentPromptCard parent={parent} />
      )}
    </div>
  );
}

/** Render the parent prompt's decoded (system, user) pair so the
 *  reviewer sees the same human-readable shape they're editing
 *  above. Falls back to a "legacy shape" badge when the parent
 *  pre-dates the JSON envelope. */
function ParentPromptCard({ parent }: { parent: PromptVersion }) {
  const envelope = decodePromptTemplate(parent.template);
  const variables = variablesForPrompt(parent.kind, parent.scope);
  return (
    <div className="mt-6 rounded-lg border border-gray-200 bg-white p-5 shadow-xs">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold tracking-wide text-gray-900 uppercase">
            Parent prompt
          </h2>
          <p className="mt-1 text-[11px] text-gray-500">
            For reference. Edits above replace the active row at the next approve.
          </p>
        </div>
        {envelope.source !== 'json' && (
          <span
            title="Pre-envelope row. Approving the new version above will write a JSON envelope; the legacy shape stays on the retired row for audit."
            className="inline-flex items-center rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-amber-200"
          >
            Legacy shape
          </span>
        )}
      </header>
      <div className="mt-3 space-y-3">
        <div>
          <h3 className="text-[11px] font-semibold tracking-wide text-gray-500 uppercase">
            System
          </h3>
          <PromptTemplateDisplay
            template={envelope.system}
            variables={variables}
            emptyMessage="— no system instruction —"
          />
        </div>
        <div>
          <h3 className="text-[11px] font-semibold tracking-wide text-gray-500 uppercase">
            User
          </h3>
          <PromptTemplateDisplay
            template={envelope.user}
            variables={variables}
            emptyMessage="— empty —"
          />
        </div>
      </div>
    </div>
  );
}

// kindContextLabel returns the typed Go-side struct admins should
// expect when authoring a template. Mirrors the resolver's mapping
// in service-catalog-feed/usecases/ai/prompts/registry.go.
function kindContextLabel(kind: PromptKind, scope: string): string {
  if (kind === 'generation') return 'GenerationData';
  if (kind === 'judge') return 'JudgeData';
  if (kind === 'extraction') {
    if (scope.startsWith('procedural::')) return 'ProceduralContext';
    if (scope === 'mosaic_grid') return '(no inputs)';
    return 'aidomain.Context';
  }
  return '(no documented inputs)';
}
