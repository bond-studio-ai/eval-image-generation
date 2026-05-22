'use client';

import { BulkDeleteBar } from '@/components/bulk-delete-bar';
import {
  actionsColumn,
  checkboxColumn,
  DataTable,
  DateCell,
  NameCell,
  SearchBar,
  SelectAllCheckbox,
  StatusBadge,
  ToggleFilter,
  type DataTableColumn,
  type RowAction,
} from '@/components/data-table';
import { Pagination } from '@/components/pagination';
import { toast, useConfirm } from '@/components/ui';
import { useInfiniteList } from '@/hooks/use-infinite-list';
import { serviceUrl } from '@/lib/api-base';
import type { StrategyListItem } from '@/lib/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';

export function StrategiesTable() {
  const router = useRouter();
  const confirm = useConfirm();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [cloningId, setCloningId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activeOnly, setActiveOnly] = useState(false);

  const {
    items,
    loading,
    total,
    totalPages,
    page,
    search,
    setSearch,
    goToPage,
    paginating,
    refresh,
    setFilters,
  } = useInfiniteList<StrategyListItem>('strategies', { limit: 20 });

  const updateActiveOnly = useCallback(
    (on: boolean) => {
      setActiveOnly(on);
      setFilters(on ? { is_active: 'true' } : {});
    },
    [setFilters],
  );

  const handleClone = useCallback(
    async (id: string) => {
      setCloningId(id);
      try {
        const res = await fetch(serviceUrl(`strategies/${id}/clone`), { method: 'POST' });
        if (!res.ok) {
          toast.error('Failed to clone strategy', {
            description: `Server responded with ${res.status}.`,
          });
          return;
        }
        const json = await res.json();
        const newId = json.data?.id;
        if (newId) {
          toast.success('Strategy cloned');
          router.push(`/strategies/${newId}/edit`);
        }
      } catch (e) {
        toast.error('Failed to clone strategy', {
          description: e instanceof Error ? e.message : undefined,
        });
      } finally {
        setCloningId(null);
      }
    },
    [router],
  );

  const handleDelete = useCallback(
    async (id: string, name: string) => {
      const ok = await confirm({
        title: `Delete strategy "${name}"?`,
        description: 'This will soft-delete the strategy. You can restore it later if needed.',
        confirmLabel: 'Delete strategy',
        tone: 'danger',
      });
      if (!ok) return;
      setDeletingId(id);
      try {
        const res = await fetch(serviceUrl(`strategies/${id}`), { method: 'DELETE' });
        if (!res.ok) {
          toast.error('Failed to delete strategy', {
            description: `Server responded with ${res.status}.`,
          });
          return;
        }
        toast.success(`Deleted strategy "${name}"`);
        refresh();
      } catch (e) {
        toast.error('Failed to delete strategy', {
          description: e instanceof Error ? e.message : undefined,
        });
      } finally {
        setDeletingId(null);
      }
    },
    [refresh, confirm],
  );

  const handleDeactivate = useCallback(
    async (id: string) => {
      setTogglingId(id);
      try {
        const res = await fetch(serviceUrl(`strategies/${id}/deactivate`), { method: 'POST' });
        if (!res.ok) {
          toast.error('Failed to deactivate strategy', {
            description: `Server responded with ${res.status}.`,
          });
          return;
        }
        toast.success('Strategy deactivated');
        refresh();
      } catch (e) {
        toast.error('Failed to deactivate strategy', {
          description: e instanceof Error ? e.message : undefined,
        });
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
    const results = await Promise.allSettled(
      ids.map((id) => fetch(serviceUrl(`strategies/${id}`), { method: 'DELETE' })),
    );
    const failed = results.filter(
      (r) => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.ok),
    ).length;
    if (failed === 0) {
      toast.success(`Deleted ${ids.length} strateg${ids.length === 1 ? 'y' : 'ies'}`);
    } else if (failed === ids.length) {
      toast.error('Failed to delete strategies');
    } else {
      toast.warning(`Deleted ${ids.length - failed} of ${ids.length}`, {
        description: `${failed} failed.`,
      });
    }
    setSelected(new Set());
    refresh();
  }, [selected, refresh]);

  const actions = useMemo<RowAction<StrategyListItem>[]>(
    () => [
      {
        icon: 'clone',
        label: 'Clone strategy',
        onClick: (s) => handleClone(s.id),
        loading: (s) => cloningId === s.id,
      },
      {
        icon: 'delete',
        label: 'Delete strategy',
        onClick: (s) => handleDelete(s.id, s.name),
        variant: 'danger',
        loading: (s) => deletingId === s.id,
      },
    ],
    [handleClone, handleDelete, cloningId, deletingId],
  );

  const columns = useMemo<DataTableColumn<StrategyListItem>[]>(
    () => [
      checkboxColumn<StrategyListItem>({
        selected,
        onToggle: toggleSelect,
        rowId: (s) => s.id,
      }),
      {
        header: 'Name',
        cell: (s) => (
          <NameCell href={`/strategies/${s.id}`} name={s.name} subtitle={s.description} />
        ),
        cellClassName: 'px-6 py-4',
      },
      {
        header: 'Status',
        cell: (s) => {
          if (!s.activeForSource) {
            return (
              <Link href={`/strategies/${s.id}`} title="Open strategy to activate it">
                <StatusBadge status="inactive" />
              </Link>
            );
          }
          const sourceLabel =
            s.activeForSource === 'photo'
              ? 'Photo'
              : s.activeForSource === 'pdp'
                ? 'PDP'
                : 'Dollhouse';
          return (
            <button
              type="button"
              onClick={() => handleDeactivate(s.id)}
              disabled={togglingId === s.id}
              className="disabled:opacity-50"
              title={`Deactivate (currently active for ${sourceLabel.toLowerCase()})`}
            >
              <StatusBadge status="active" label={`Active · ${sourceLabel}`} />
            </button>
          );
        },
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
    ],
    [actions, handleDeactivate, togglingId, selected, toggleSelect],
  );

  const toolbar = (
    <div className="flex items-center gap-4">
      <div className="w-72">
        <SearchBar value={search} onChange={setSearch} placeholder="Search strategies..." />
      </div>
      <ToggleFilter label="Active only" checked={activeOnly} onChange={updateActiveOnly} />
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
        emptyMessage={
          search || activeOnly ? 'No strategies match your filters.' : 'No strategies found.'
        }
        loading={loading}
        toolbar={toolbar}
        footer={
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            onPageChange={goToPage}
            loading={paginating}
          />
        }
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
