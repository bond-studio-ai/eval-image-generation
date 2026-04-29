'use client';

import { PromptStatusBadge, formatDateTime } from '@/components/catalog-confidence/badges';
import { PageHeader, PrimaryLinkButton } from '@/components/page-header';
import type { PromptKind, PromptVersion } from '@/lib/catalog-feed-client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

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
            <span className="text-xs text-gray-500">
              created {formatDateTime(prompt.createdAt)} by {prompt.createdBy || '—'}
            </span>
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            {prompt.status === 'proposed' && (
              <button
                type="button"
                onClick={handleApprove}
                disabled={approving}
                className="inline-flex items-center rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:bg-green-300"
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
          </div>
        }
      />

      {error && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800">
          Approve failed: {error}
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Kind" value={KIND_LABELS[prompt.kind]} />
        <Stat label="Activated" value={formatDateTime(prompt.activatedAt) || '—'} />
        <Stat label="Retired" value={formatDateTime(prompt.retiredAt) || '—'} />
      </div>

      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-5 shadow-xs">
        <h2 className="text-sm font-semibold tracking-wide text-gray-900 uppercase">Template</h2>
        <pre className="mt-3 max-h-[600px] overflow-auto rounded bg-gray-50 p-3 font-mono text-[11px] whitespace-pre-wrap text-gray-700">
          {prompt.template}
        </pre>
      </div>

      {prompt.rationale && (
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-5 shadow-xs">
          <h2 className="text-sm font-semibold tracking-wide text-gray-900 uppercase">
            Rationale
          </h2>
          <p className="mt-3 text-sm whitespace-pre-wrap text-gray-700">{prompt.rationale}</p>
        </div>
      )}

      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-5 shadow-xs">
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-xs">
      <p className="text-xs font-medium text-gray-600">{label}</p>
      <p className="mt-1 truncate text-base font-semibold text-gray-900">{value}</p>
    </div>
  );
}
