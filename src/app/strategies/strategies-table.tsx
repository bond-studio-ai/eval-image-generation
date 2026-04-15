'use client';

import { BulkDeleteBar } from '@/components/bulk-delete-bar';
import {
  DataTable,
  DateCell,
  FilterPills,
  NameCell,
  SearchBar,
  SelectAllCheckbox,
  StatusBadge,
  actionsColumn,
  checkboxColumn,
  type DataTableColumn,
  type RowAction,
} from '@/components/data-table';
import { DeployToEnvironmentButton } from '@/components/deploy-to-environment-button';
import { useInfiniteList } from '@/hooks/use-infinite-list';
import { serviceUrl } from '@/lib/api-base';
import type { StrategyListItem } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';

type StatusFilter = 'all' | 'active' | 'inactive';

const STATUS_OPTIONS: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
];

export function StrategiesTable() {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [cloningId, setCloningId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const {
    items,
    loading,
    loadingMore,
    hasMore,
    search,
    setSearch,
    loadMore,
    refresh,
    setFilters,
  } = useInfiniteList<StrategyListItem>('strategies', { limit: 20 });

  const updateStatusFilter = useCallback((v: StatusFilter) => {
    setStatusFilter(v);
    const f: Record<string, string> = {};
    if (v !== 'all') f.is_active = v === 'active' ? 'true' : 'false';
    setFilters(f);
  }, [setFilters]);

  const handleClone = useCallback(
    async (id: string) => {
      setCloningId(id);
      try {
        const res = await fetch(serviceUrl(`strategies/${id}/clone`), { method: 'POST' });
        if (!res.ok) return;
        const json = await res.json();
        const newId = json.data?.id;
        if (newId) {
          router.push(`/strategies/${newId}/edit`);
        }
      } catch {
        // ignore
      } finally {
        setCloningId(null);
      }
    },
    [router],
  );

  const handleDelete = useCallback(
    async (id: string, name: string) => {
      if (!confirm(`Delete strategy "${name}"? This will soft-delete the strategy.`)) return;
      setDeletingId(id);
      try {
        const res = await fetch(serviceUrl(`strategies/${id}`), { method: 'DELETE' });
        if (!res.ok) return;
        refresh();
      } catch {
        // ignore
      } finally {
        setDeletingId(null);
      }
    },
    [refresh],
  );

  const handleToggleActive = useCallback(
    async (id: string, currentlyActive: boolean) => {
      setTogglingId(id);
      try {
        const action = currentlyActive ? 'deactivate' : 'activate';
        const res = await fetch(serviceUrl(`strategies/${id}/${action}`), { method: 'POST' });
        if (!res.ok) return;
        refresh();
      } catch {
        // ignore
      } finally {
        setTogglingId(null);
      }
    },
    [refresh],
  );

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelected((prev) => {
      if (prev.size === items.length) return new Set();
      return new Set(items.map((s) => s.id));
    });
  }, [items]);

  const handleBulkDelete = useCallback(async () => {
    const ids = [...selected];
    await Promise.all(
      ids.map((id) => fetch(serviceUrl(`strategies/${id}`), { method: 'DELETE' })),
    );
    setSelected(new Set());
    refresh();
  }, [selected, refresh]);

  const actions = useMemo<RowAction<StrategyListItem>[]>(() => [
    { icon: 'clone', label: 'Clone strategy', onClick: (s) => handleClone(s.id), loading: (s) => cloningId === s.id },
    { render: (s) => <DeployToEnvironmentButton strategyId={s.id} variant="icon" /> },
    { icon: 'delete', label: 'Delete strategy', onClick: (s) => handleDelete(s.id, s.name), variant: 'danger', loading: (s) => deletingId === s.id },
  ], [handleClone, handleDelete, cloningId, deletingId]);

  const columns = useMemo<DataTableColumn<StrategyListItem>[]>(() => [
    checkboxColumn<StrategyListItem>({
      selected,
      onToggle: toggleSelect,
      rowId: (s) => s.id,
    }),
    {
      header: 'Name',
      cell: (s) => <NameCell href={`/strategies/${s.id}`} name={s.name} subtitle={s.description} />,
      cellClassName: 'px-6 py-4',
    },
    {
      header: 'Status',
      cell: (s) => (
        <button
          type="button"
          onClick={() => handleToggleActive(s.id, s.isActive)}
          disabled={togglingId === s.id}
          className="disabled:opacity-50"
          title={s.isActive ? 'Deactivate strategy' : 'Activate strategy'}
        >
          <StatusBadge status={s.isActive ? 'active' : 'inactive'} />
        </button>
      ),
    },
    {
      header: 'Steps',
      cell: (s) => `${s.stepCount} step${s.stepCount !== 1 ? 's' : ''}`,
    },
    {
      header: 'Runs',
      cell: (s) => `${s.runCount} run${s.runCount !== 1 ? 's' : ''}`,
    },
    {
      header: 'Created',
      cell: (s) => <DateCell date={s.createdAt} />,
    },
    actionsColumn(actions),
  ], [actions, handleToggleActive, togglingId, selected, toggleSelect]);

  const toolbar = (
    <div className="flex items-center gap-4">
      <div className="w-72">
        <SearchBar value={search} onChange={setSearch} placeholder="Search strategies..." />
      </div>
      <FilterPills options={STATUS_OPTIONS} value={statusFilter} onChange={updateStatusFilter} />
      <div className="ml-auto">
        <SelectAllCheckbox count={selected.size} total={items.length} onToggle={toggleAll} />
      </div>
    </div>
  );

  return (
    <>
      <DataTable
        columns={columns}
        data={items}
        rowKey={(s) => s.id}
        rowClassName={(s) => `hover:bg-gray-50 ${selected.has(s.id) ? 'bg-primary-50/50' : ''}`}
        emptyMessage={search || statusFilter !== 'all' ? 'No strategies match your filters.' : 'No strategies found.'}
        loading={loading}
        toolbar={toolbar}
        onLoadMore={loadMore}
        hasMore={hasMore}
        loadingMore={loadingMore}
      />

      <BulkDeleteBar
        selectedCount={selected.size}
        onDelete={handleBulkDelete}
        onClearSelection={() => setSelected(new Set())}
        entityName="strategies"
      />
    </>
  );
}
