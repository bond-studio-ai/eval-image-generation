'use client';

import type { PromptKind } from '@/lib/catalog-feed-client';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useId, useMemo, useState } from 'react';

const KIND_OPTIONS: { value: PromptKind; label: string }[] = [
  { value: 'generation', label: 'Generation' },
  { value: 'judge', label: 'Judge' },
  { value: 'extraction', label: 'Extraction' },
  { value: 'meta', label: 'Meta' },
];

export interface ScopeOption {
  kind: PromptKind;
  scope: string;
}

interface ProposePromptFormProps {
  // All (kind, scope) pairs that already exist as active prompt versions.
  // Used to power the searchable scope combobox; the input still accepts
  // free text so a reviewer can introduce a brand-new scope.
  availableScopes?: ScopeOption[];
}

export function ProposePromptForm({ availableScopes = [] }: ProposePromptFormProps) {
  const { user } = useUser();
  const router = useRouter();
  const [kind, setKind] = useState<PromptKind>('judge');
  const [scope, setScope] = useState('');
  const [template, setTemplate] = useState('');
  const [rationale, setRationale] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  // Stable per-instance datalist id — using useId() so multiple form
  // instances on the same page (unlikely today, but cheap) don't collide.
  const datalistId = useId();
  const scopeOptions = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const opt of availableScopes) {
      if (opt.kind !== kind) continue;
      if (seen.has(opt.scope)) continue;
      seen.add(opt.scope);
      out.push(opt.scope);
    }
    return out.sort((a, b) => a.localeCompare(b));
  }, [availableScopes, kind]);

  const createdBy = user?.primaryEmailAddress?.emailAddress ?? user?.id ?? '';

  const submit = async () => {
    if (!scope.trim() || !template.trim()) {
      setError('Scope and template are required');
      return;
    }
    setSubmitting(true);
    setError(null);
    setOk(false);
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
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`${res.status}: ${text.slice(0, 300)}`);
      }
      setOk(true);
      setScope('');
      setTemplate('');
      setRationale('');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
      <label className="text-xs font-medium text-gray-600">
        Kind
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as PromptKind)}
          className="focus:border-primary-500 focus:ring-primary-500 mt-1 w-full rounded-md border-gray-300 px-2 py-1 text-sm text-gray-900 shadow-xs"
        >
          {KIND_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs font-medium text-gray-600">
        Scope
        {/*
          Native <datalist>-backed combobox: typing filters the suggestions
          incrementally and the user can still submit a brand-new scope
          (free text), which is what we want for proposing scopes that
          don't exist yet. Switching `kind` repopulates the suggestion
          list to only the relevant scopes.
        */}
        <input
          value={scope}
          onChange={(e) => setScope(e.target.value)}
          placeholder={
            scopeOptions.length > 0
              ? `e.g. ${scopeOptions[0]} — or type a new scope`
              : 'tear_sheet:faucets'
          }
          list={datalistId}
          autoComplete="off"
          className="focus:border-primary-500 focus:ring-primary-500 mt-1 w-full rounded-md border-gray-300 px-2 py-1 text-sm text-gray-900 shadow-xs"
        />
        <datalist id={datalistId}>
          {scopeOptions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
        {scopeOptions.length > 0 && (
          <span className="mt-1 block text-[11px] text-gray-500">
            {scopeOptions.length} existing {kind} scope
            {scopeOptions.length === 1 ? '' : 's'} — start typing to filter.
          </span>
        )}
      </label>
      <label className="text-xs font-medium text-gray-600 md:col-span-2">
        Template
        <textarea
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          rows={8}
          className="focus:border-primary-500 focus:ring-primary-500 mt-1 block w-full rounded-md border-gray-300 px-2 py-1.5 font-mono text-xs text-gray-900 shadow-xs"
          placeholder="The full prompt template as it will be sent to the model…"
        />
      </label>
      <label className="text-xs font-medium text-gray-600 md:col-span-2">
        Rationale (optional)
        <input
          value={rationale}
          onChange={(e) => setRationale(e.target.value)}
          placeholder="Why is this proposal better than the active prompt?"
          className="focus:border-primary-500 focus:ring-primary-500 mt-1 w-full rounded-md border-gray-300 px-2 py-1 text-sm text-gray-900 shadow-xs"
        />
      </label>
      <div className="flex items-center gap-3 md:col-span-2">
        <button
          type="button"
          onClick={submit}
          disabled={submitting}
          className="bg-primary-600 hover:bg-primary-700 disabled:bg-primary-300 inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white shadow-xs transition-colors"
        >
          {submitting ? 'Submitting…' : 'Propose prompt'}
        </button>
        {createdBy && <span className="text-xs text-gray-500">by {createdBy}</span>}
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800 md:col-span-2">
          {error}
        </div>
      )}
      {ok && (
        <div className="rounded-md border border-green-200 bg-green-50 p-3 text-xs text-green-800 md:col-span-2">
          Proposal created. Promote it from the table above after Evals passes.
        </div>
      )}
    </div>
  );
}
