'use client';

import { PromptStatusBadge, formatDateTime } from '@/components/catalog-confidence/badges';
import { PageHeader, PrimaryLinkButton } from '@/components/page-header';
import { TwoPaneSplit } from '@/components/two-pane-split';
import type { PromptKind, PromptVersion } from '@/lib/catalog-feed-client';
import {
  contextLabelForPrompt,
  decodePromptTemplate,
  variablesForPrompt,
} from '@/lib/prompt-template-format';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { PromptTemplateDisplay } from './prompt-template-display';

const KIND_LABELS: Record<PromptKind, string> = {
  generation: 'Generation',
  judge: 'Judge',
  extraction: 'Extraction',
  meta: 'Meta',
};

interface CatalogPromptDetailProps {
  prompt: PromptVersion;
  history: PromptVersion[];
}

export function CatalogPromptDetail({ prompt, history }: CatalogPromptDetailProps) {
  const router = useRouter();
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const envelope = useMemo(() => decodePromptTemplate(prompt.template), [prompt.template]);
  const variables = useMemo(
    () => variablesForPrompt(prompt.kind, prompt.scope),
    [prompt.kind, prompt.scope],
  );

  const handleApprove = async () => {
    setApproving(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/catalog-feed/admin/prompts/${prompt.id}/approve`, {
        method: 'POST',
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`${res.status}: ${text.slice(0, 300)}`);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setApproving(false);
    }
  };

  return (
    <div className="flex flex-col">
      <PageHeader
        backHref="/catalog-prompts"
        backLabel="Back to Catalog Prompts"
        title={prompt.scope}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-[11px] font-medium tracking-wide text-gray-700 uppercase">
              {KIND_LABELS[prompt.kind]}
            </span>
            <PromptStatusBadge status={prompt.status} />
            <SourceShapeBadge source={envelope.source} />
            <span className="text-xs text-gray-500">
              created {formatDateTime(prompt.createdAt)} by {prompt.createdBy || '—'}
            </span>
          </span>
        }
        actions={
          <>
            {prompt.status === 'proposed' && (
              <button
                type="button"
                onClick={handleApprove}
                disabled={approving}
                className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-xs transition-colors hover:bg-green-700 disabled:bg-green-300"
              >
                {approving ? 'Approving…' : 'Approve'}
              </button>
            )}
            <PrimaryLinkButton
              href={`/catalog-prompts/new?parentId=${encodeURIComponent(prompt.id)}`}
              icon
            >
              Propose New Version
            </PrimaryLinkButton>
          </>
        }
      />

      {error && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800">
          Approve failed: {error}
        </div>
      )}

      {/* Stats — mirrors the four-card grid on /prompt-versions/[id] */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Stat label="Kind" value={KIND_LABELS[prompt.kind]} />
        <Stat label="Context" value={contextLabelForPrompt(prompt.kind, prompt.scope)} mono />
        <Stat label="Activated" value={formatDateTime(prompt.activatedAt) || '—'} />
        <Stat label="Retired" value={formatDateTime(prompt.retiredAt) || '—'} />
      </div>

      {/* Prompts — TwoPaneSplit (System left, User right) identical to
          /prompt-versions/[id] so the read-only surfaces share their
          visual rhythm. Each pane renders the highlighted display so
          {{.Field}} chips, control-flow brackets, and pipeline
          expressions stay readable without leaving this page. */}
      <TwoPaneSplit
        className="mt-8"
        left={
          <div className="flex h-full min-w-0 flex-col rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
            <div className="shrink-0">
              <h2 className="text-sm font-semibold uppercase text-gray-900">System Prompt</h2>
              <p className="mt-1 text-[11px] text-gray-500">
                Sent as the system message — sets the model&apos;s role and output contract.
              </p>
            </div>
            <div className="mt-3 min-h-0 flex-1 overflow-auto">
              <PromptTemplateDisplay
                template={envelope.system}
                variables={variables}
                emptyMessage="— no system instruction; this prompt only ships a user message —"
              />
            </div>
          </div>
        }
        right={
          <div className="flex h-full min-w-0 flex-col rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
            <div className="shrink-0">
              <h2 className="text-sm font-semibold uppercase text-gray-900">User Prompt</h2>
              <p className="mt-1 text-[11px] text-gray-500">
                Sent as the user message — describes the task and substitutes the typed values.
              </p>
            </div>
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

      <ReferenceVariablesCard prompt={prompt} variables={variables} />

      {prompt.rationale && (
        <div className="mt-8 rounded-lg border border-gray-200 bg-white p-5 shadow-xs">
          <h2 className="text-sm font-semibold tracking-wide text-gray-900 uppercase">
            Rationale
          </h2>
          <p className="mt-3 text-sm whitespace-pre-wrap text-gray-700">{prompt.rationale}</p>
        </div>
      )}

      <div className="mt-8 rounded-lg border border-gray-200 bg-white p-5 shadow-xs">
        <h2 className="text-sm font-semibold tracking-wide text-gray-900 uppercase">
          History for {prompt.kind}:{prompt.scope}
        </h2>
        <p className="mt-1 text-[11px] text-gray-500">
          Every proposal and approval that has ever existed at this (kind, scope). Active rows
          are what the worker reads at runtime; retired rows kept for audit.
        </p>
        <div className="mt-3 overflow-clip rounded-md border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-[10px] font-semibold tracking-wider text-gray-600 uppercase">
                  Status
                </th>
                <th className="px-4 py-2 text-left text-[10px] font-semibold tracking-wider text-gray-600 uppercase">
                  Created
                </th>
                <th className="px-4 py-2 text-left text-[10px] font-semibold tracking-wider text-gray-600 uppercase">
                  Activated
                </th>
                <th className="px-4 py-2 text-left text-[10px] font-semibold tracking-wider text-gray-600 uppercase">
                  Retired
                </th>
                <th className="px-4 py-2 text-left text-[10px] font-semibold tracking-wider text-gray-600 uppercase">
                  By
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {history.map((row) => (
                <tr
                  key={row.id}
                  className={row.id === prompt.id ? 'bg-primary-50/30' : 'hover:bg-gray-50'}
                >
                  <td className="px-4 py-2 align-top">
                    <Link
                      href={`/catalog-prompts/${row.id}`}
                      className="text-xs text-primary-600 hover:text-primary-500"
                    >
                      <PromptStatusBadge status={row.status} />
                    </Link>
                  </td>
                  <td className="px-4 py-2 align-top text-xs text-gray-700">
                    {formatDateTime(row.createdAt)}
                  </td>
                  <td className="px-4 py-2 align-top text-xs text-gray-700">
                    {formatDateTime(row.activatedAt)}
                  </td>
                  <td className="px-4 py-2 align-top text-xs text-gray-700">
                    {formatDateTime(row.retiredAt)}
                  </td>
                  <td className="px-4 py-2 align-top text-xs text-gray-700">
                    {row.createdBy || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-xs">
      <p className="text-xs font-medium text-gray-600">{label}</p>
      <p
        className={`mt-1 truncate text-base font-semibold text-gray-900 ${mono ? 'font-mono text-sm' : ''}`}
      >
        {value}
      </p>
    </div>
  );
}

function SourceShapeBadge({ source }: { source: 'json' | 'legacy-divider' | 'plain' }) {
  if (source === 'json') {
    return (
      <span className="inline-flex items-center rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-emerald-200">
        JSON envelope
      </span>
    );
  }
  if (source === 'legacy-divider') {
    return (
      <span
        title="Pre-envelope row using the system\n---\nuser delimiter. Approve a new version to migrate this row to the JSON envelope shape."
        className="inline-flex items-center rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-amber-200"
      >
        Legacy --- divider
      </span>
    );
  }
  return (
    <span
      title="Plain-text row with no system/user separation. The worker treats the whole content as the user message and falls back to the seed system prompt."
      className="inline-flex items-center rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-amber-200"
    >
      Plain text (legacy)
    </span>
  );
}

function ReferenceVariablesCard({
  prompt,
  variables,
}: {
  prompt: PromptVersion;
  variables: ReturnType<typeof variablesForPrompt>;
}) {
  if (variables.length === 0) {
    return (
      <section className="mt-8 rounded-lg border border-gray-200 bg-white p-5 shadow-xs">
        <h2 className="text-sm font-semibold tracking-wide text-gray-900 uppercase">
          Reference variables
        </h2>
        <p className="mt-2 text-xs text-gray-500">
          This prompt has no documented runtime variables for ({prompt.kind}, {prompt.scope}).
          Anything you reference with <code>{'{{.Field}}'}</code> will resolve to the zero
          value of the worker&apos;s data struct (or fail at render time if the field does
          not exist).
        </p>
      </section>
    );
  }
  // Group rendering keeps related fields adjacent in the table —
  // mirrors the dropdown groups in the editor.
  const groups = new Map<string, typeof variables>();
  for (const v of variables) {
    const arr = groups.get(v.group) ?? [];
    arr.push(v);
    groups.set(v.group, arr);
  }
  return (
    <section className="mt-8 rounded-lg border border-gray-200 bg-white p-5 shadow-xs">
      <h2 className="text-sm font-semibold tracking-wide text-gray-900 uppercase">
        Reference variables
      </h2>
      <p className="mt-1 text-[11px] text-gray-500">
        These are the typed fields the worker injects when rendering this prompt. Insert
        them in a new version with the dropdown on the editor screen.
      </p>
      <div className="mt-4 space-y-4">
        {[...groups.entries()].map(([group, vars]) => (
          <div key={group}>
            <h3 className="text-[11px] font-semibold tracking-wide text-gray-500 uppercase">
              {group}
            </h3>
            <div className="mt-2 overflow-clip rounded-md border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-1.5 text-left text-[10px] font-semibold tracking-wider text-gray-600 uppercase">
                      Variable
                    </th>
                    <th className="px-3 py-1.5 text-left text-[10px] font-semibold tracking-wider text-gray-600 uppercase">
                      Type
                    </th>
                    <th className="px-3 py-1.5 text-left text-[10px] font-semibold tracking-wider text-gray-600 uppercase">
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {vars.map((v) => (
                    <tr key={v.name}>
                      <td className="px-3 py-1.5 align-top">
                        <code className="rounded bg-emerald-50 px-1.5 py-0.5 font-mono text-[11px] text-emerald-800 ring-1 ring-emerald-200">
                          {`{{.${v.name}}}`}
                        </code>
                      </td>
                      <td className="px-3 py-1.5 align-top font-mono text-[11px] text-gray-700">
                        {v.type}
                      </td>
                      <td className="px-3 py-1.5 align-top text-xs text-gray-700">
                        {v.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
