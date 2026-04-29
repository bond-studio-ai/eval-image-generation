'use client';

import { PageHeader, PrimaryButton } from '@/components/page-header';
import { ErrorCard } from '@/components/resource-form-header';
import { SearchableSelect } from '@/components/searchable-select';
import { TwoPaneSplit } from '@/components/two-pane-split';
import type { PromptKind, PromptVersion } from '@/lib/catalog-feed-client';
import {
  contextLabelForPrompt,
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
 * Layout mirrors `/prompt-versions/new` so admins moving between the
 * two surfaces find the same affordances in the same places: an
 * identity card up top (here Kind+Scope, there Name+Description), a
 * stats preview grid, then a TwoPaneSplit hosting System Prompt on
 * the left and User Prompt on the right. The Insert-variable
 * dropdown sits at the top of each pane like the
 * Conditional/Reference/Dollhouse pickers do in the handlebars
 * editor.
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

      {/* Identity — analogous to ResourceFormHeader on /prompt-versions/new */}
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

      {/* Stats preview — mirrors the placeholder grid on /prompt-versions/new
          so the page rhythm matches even before the proposal exists in DB. */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <StatCard label="Kind" value={KIND_LABEL_MAP[kind]} />
        <StatCard label="Context" value={contextLabelForPrompt(kind, scope)} mono />
        <StatCard label="Variables" value={`${variables.length}`} />
        <StatCard
          label="Status on submit"
          value="proposed"
          tone="amber"
        />
      </div>

      {/* Prompts — TwoPaneSplit with System (left) and User (right),
          identical layout to /prompt-versions/new. */}
      <TwoPaneSplit
        className="mt-8"
        left={
          <PromptPaneCard
            heading="System Prompt"
            required={false}
            hint="Sent as the system message — sets the model's role and output contract. Optional."
          >
            <PromptTemplateEditor
              value={systemTemplate}
              onChange={setSystemTemplate}
              variables={variables}
              ariaLabel="System prompt"
              placeholder={`You are a strict extractor for…\n\nUse {{.Field}} to inject typed values from ${contextLabelForPrompt(kind, scope)}.`}
              fillHeight
            />
          </PromptPaneCard>
        }
        right={
          <PromptPaneCard
            heading="User Prompt"
            required
            hint="Sent as the user message — describes the task and references the typed values."
          >
            <PromptTemplateEditor
              value={userTemplate}
              onChange={setUserTemplate}
              variables={variables}
              ariaLabel="User prompt"
              placeholder={`Given this product image…\n\nUse the Insert variable dropdown above to add a typed reference.`}
              fillHeight
            />
          </PromptPaneCard>
        }
      />

      {/* Rationale */}
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

      {isNewVersion && parent && <ParentPromptSection parent={parent} />}
    </div>
  );
}

/**
 * Pane wrapper used by the System/User cards inside the form's
 * TwoPaneSplit. Mirrors the markup of the prompt-versions form
 * (`flex h-full min-w-0 flex-col … p-6`) so both surfaces share the
 * same vertical rhythm: heading at top, hint underneath, editor
 * filling the remaining height.
 */
function PromptPaneCard({
  heading,
  required,
  hint,
  children,
}: {
  heading: string;
  required: boolean;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full min-w-0 flex-col rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
      <div className="shrink-0">
        <h2 className="text-sm font-semibold uppercase text-gray-900">
          {heading}
          {required && <span className="ml-1 text-red-500">*</span>}
        </h2>
        <p className="mt-1 text-[11px] text-gray-500">{hint}</p>
      </div>
      <div className="mt-3 flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}

function StatCard({
  label,
  value,
  mono = false,
  tone = 'default',
}: {
  label: string;
  value: string;
  mono?: boolean;
  tone?: 'default' | 'amber';
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-xs">
      <p className="text-sm font-medium text-gray-600">{label}</p>
      <p
        className={`mt-1 truncate text-base font-semibold ${
          tone === 'amber' ? 'text-amber-600' : 'text-gray-900'
        } ${mono ? 'font-mono text-sm' : ''}`}
      >
        {value}
      </p>
    </div>
  );
}

/** Render the parent prompt's decoded (system, user) pair so the
 *  reviewer sees the same human-readable shape they're editing
 *  above. Uses the same TwoPaneSplit layout as the editor pair so
 *  the side-by-side comparison is honest. Falls back to a
 *  "legacy shape" badge when the parent pre-dates the JSON
 *  envelope. */
function ParentPromptSection({ parent }: { parent: PromptVersion }) {
  const envelope = decodePromptTemplate(parent.template);
  const variables = variablesForPrompt(parent.kind, parent.scope);
  return (
    <div className="mt-8">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Parent prompt</h2>
          <p className="mt-1 text-sm text-gray-600">
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
      </div>
      <TwoPaneSplit
        className="mt-4"
        height={360}
        left={
          <div className="flex h-full min-w-0 flex-col rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
            <h2 className="shrink-0 text-sm font-semibold uppercase text-gray-900">
              System Prompt
            </h2>
            <div className="mt-3 min-h-0 flex-1 overflow-auto">
              <PromptTemplateDisplay
                template={envelope.system}
                variables={variables}
                emptyMessage="— no system instruction —"
              />
            </div>
          </div>
        }
        right={
          <div className="flex h-full min-w-0 flex-col rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
            <h2 className="shrink-0 text-sm font-semibold uppercase text-gray-900">
              User Prompt
            </h2>
            <div className="mt-3 min-h-0 flex-1 overflow-auto">
              <PromptTemplateDisplay
                template={envelope.user}
                variables={variables}
                emptyMessage="— empty —"
              />
            </div>
          </div>
        }
      />
    </div>
  );
}
