'use client';

import { PromptStatusBadge, formatDateTime } from '@/components/catalog-confidence/badges';
import {
  DataTable,
  SearchBar,
  actionsColumn,
  type DataTableColumn,
  type RowAction,
} from '@/components/data-table';
import { SearchableSelect } from '@/components/searchable-select';
import type { PromptKind, PromptStatus, PromptVersion } from '@/lib/catalog-feed-client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';

interface CatalogPromptsListProps {
  rows: PromptVersion[];
  loadError: string | null;
}

const KIND_LABELS: Record<PromptKind, string> = {
  generation: 'Generation',
  judge: 'Judge',
  extraction: 'Extraction',
  meta: 'Meta',
};

const KIND_VALUES: Array<{ value: PromptKind | ''; label: string }> = [
  { value: '', label: 'All kinds' },
  { value: 'generation', label: 'Generation' },
  { value: 'judge', label: 'Judge' },
  { value: 'extraction', label: 'Extraction' },
  { value: 'meta', label: 'Meta' },
];

const STATUS_VALUES: Array<{ value: PromptStatus | ''; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'proposed', label: 'Proposed' },
  { value: 'retired', label: 'Retired' },
];

/**
 * CatalogPromptsList renders the catalog-prompts table on top of the
 * shared DataTable + SearchBar primitives so it matches the rest of
 * the app (prompt-versions, input-presets, etc.). The list is fed
 * the full `rows` array from a server component because the admin
 * `/admin/prompts` endpoint returns a flat list rather than the
 * paginated envelope `useInfiniteList` expects. We do all filtering
 * client-side; the dataset is small enough (one row per active
 * prompt-version per kind+scope) that this is a practical trade.
 */
export function CatalogPromptsList({ rows, loadError }: CatalogPromptsListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialKind = (searchParams.get('kind') ?? '') as PromptKind | '';
  const initialScope = searchParams.get('scope') ?? '';
  const initialStatus = (searchParams.get('status') ?? '') as PromptStatus | '';
  const initialSearch = searchParams.get('search') ?? '';

  const [kind, setKind] = useState<PromptKind | ''>(initialKind);
  const [scope, setScope] = useState(initialScope);
  const [status, setStatus] = useState<PromptStatus | ''>(initialStatus);
  const [search, setSearch] = useState(initialSearch);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [approveError, setApproveError] = useState<string | null>(null);

  // syncUrl mirrors the pattern used by useInfiniteList: replaceState
  // (no Next router push) so server-side `dynamic = 'force-dynamic'`
  // doesn't refetch the entire list on every keystroke.
  const syncUrl = useCallback(
    (next: { kind: string; scope: string; status: string; search: string }) => {
      const params = new URLSearchParams();
      if (next.kind) params.set('kind', next.kind);
      if (next.scope) params.set('scope', next.scope);
      if (next.status) params.set('status', next.status);
      if (next.search) params.set('search', next.search);
      const qs = params.toString();
      const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
      window.history.replaceState(null, '', url);
    },
    [],
  );

  const onKindChange = useCallback(
    (next: PromptKind | '') => {
      setKind(next);
      syncUrl({ kind: next, scope, status, search });
    },
    [syncUrl, scope, status, search],
  );

  const onScopeChange = useCallback(
    (next: string) => {
      setScope(next);
      syncUrl({ kind, scope: next, status, search });
    },
    [syncUrl, kind, status, search],
  );

  const onStatusChange = useCallback(
    (next: PromptStatus | '') => {
      setStatus(next);
      syncUrl({ kind, scope, status: next, search });
    },
    [syncUrl, kind, scope, search],
  );

  const onSearchChange = useCallback(
    (next: string) => {
      setSearch(next);
      syncUrl({ kind, scope, status, search: next });
    },
    [syncUrl, kind, scope, status],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (kind && row.kind !== kind) return false;
      if (scope && row.scope !== scope) return false;
      if (status && row.status !== status) return false;
      if (!q) return true;
      return (
        row.scope.toLowerCase().includes(q) ||
        row.template.toLowerCase().includes(q) ||
        (row.rationale ?? '').toLowerCase().includes(q) ||
        row.createdBy.toLowerCase().includes(q)
      );
    });
  }, [rows, kind, scope, status, search]);

  const scopeOptions = useMemo(() => {
    const seen = new Set<string>();
    const out: { value: string; group: string }[] = [];
    for (const row of rows) {
      if (kind && row.kind !== kind) continue;
      if (seen.has(row.scope)) continue;
      seen.add(row.scope);
      out.push({ value: row.scope, group: KIND_LABELS[row.kind] });
    }
    return out.sort((a, b) => {
      if (a.group !== b.group) return a.group.localeCompare(b.group);
      return a.value.localeCompare(b.value);
    });
  }, [rows, kind]);

  const handleApprove = useCallback(
    async (id: string) => {
      setApprovingId(id);
      setApproveError(null);
      try {
        const res = await fetch(`/api/v1/catalog-feed/admin/prompts/${id}/approve`, {
          method: 'POST',
        });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`${res.status}: ${text.slice(0, 300)}`);
        }
        // Refresh from the server so the (kind, scope) row updates
        // cleanly — the service collapses promote into a single CTE
        // so a refetch is the cheapest way to observe the new state.
        router.refresh();
      } catch (err) {
        setApproveError(err instanceof Error ? err.message : String(err));
      } finally {
        setApprovingId(null);
      }
    },
    [router],
  );

  const columns = useMemo<DataTableColumn<PromptVersion>[]>(
    () => [
      {
        header: 'Kind',
        cell: (row) => (
          <span className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-[11px] font-medium tracking-wide text-gray-700 uppercase">
            {KIND_LABELS[row.kind]}
          </span>
        ),
      },
      {
        header: 'Scope',
        cell: (row) => (
          <Link
            href={`/catalog-prompts/${row.id}`}
            className="font-mono text-xs text-primary-600 hover:text-primary-500"
          >
            {row.scope}
          </Link>
        ),
      },
      {
        header: 'Status',
        cell: (row) => <PromptStatusBadge status={row.status} />,
      },
      {
        header: 'Created',
        cell: (row) => (
          <span className="text-xs text-gray-700">{formatDateTime(row.createdAt)}</span>
        ),
      },
      {
        header: 'By',
        cell: (row) => <span className="text-xs text-gray-700">{row.createdBy || '—'}</span>,
      },
      {
        header: 'Rationale',
        cell: (row) => (
          <span className="block max-w-xs truncate text-xs text-gray-600">
            {row.rationale ? row.rationale : '—'}
          </span>
        ),
      },
      actionsColumn<PromptVersion>(buildActions(handleApprove, approvingId)),
    ],
    [handleApprove, approvingId],
  );

  const toolbar = (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-12 md:items-center">
      <div className="md:col-span-3">
        <SearchableSelect
          ariaLabel="Filter by kind"
          options={KIND_VALUES.map((opt) => ({ value: opt.value, label: opt.label }))}
          value={kind}
          onChange={(v) => onKindChange(v as PromptKind | '')}
          placeholder="All kinds"
          allowCustom={false}
          name="kind"
        />
      </div>
      <div className="md:col-span-4">
        <SearchableSelect
          ariaLabel="Filter by scope"
          options={scopeOptions.map((opt) => ({
            value: opt.value,
            group: opt.group,
          }))}
          value={scope}
          onChange={onScopeChange}
          placeholder={
            scopeOptions.length > 0
              ? `Search ${scopeOptions.length} scope${scopeOptions.length === 1 ? '' : 's'}…`
              : 'No scopes available'
          }
          allowCustom
          name="scope"
          emptyMessage="No matching scopes."
        />
      </div>
      <div className="md:col-span-2">
        <SearchableSelect
          ariaLabel="Filter by status"
          options={STATUS_VALUES.map((opt) => ({ value: opt.value, label: opt.label }))}
          value={status}
          onChange={(v) => onStatusChange(v as PromptStatus | '')}
          placeholder="All statuses"
          allowCustom={false}
          name="status"
        />
      </div>
      <div className="md:col-span-3">
        <SearchBar value={search} onChange={onSearchChange} placeholder="Search prompts…" />
      </div>
    </div>
  );

  return (
    <>
      {loadError && (
        <div className="mt-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Failed to load prompts: {loadError}
        </div>
      )}
      {approveError && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800">
          Approve failed: {approveError}
        </div>
      )}

      <DataTable
        columns={columns}
        data={filtered}
        rowKey={(row) => row.id}
        emptyMessage={
          rows.length === 0
            ? 'No prompts have been seeded or proposed yet.'
            : 'No prompts match the current filters.'
        }
        toolbar={toolbar}
      />
    </>
  );
}

function buildActions(
  handleApprove: (id: string) => void,
  approvingId: string | null,
): RowAction<PromptVersion>[] {
  return [
    {
      render: (row) => (
        <Link
          href={`/catalog-prompts/new?parentId=${encodeURIComponent(row.id)}`}
          className="inline-flex items-center rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          Propose new
        </Link>
      ),
    },
    {
      render: (row) =>
        row.status === 'proposed' ? (
          <button
            type="button"
            onClick={() => handleApprove(row.id)}
            disabled={approvingId === row.id}
            className="ml-1 inline-flex items-center rounded-md bg-green-600 px-2 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:bg-green-300"
          >
            {approvingId === row.id ? 'Approving…' : 'Approve'}
          </button>
        ) : null,
    },
  ];
}
