'use client';

import {
  DataTable,
  DateCell,
  NameCell,
  StatusBadge,
  actionsColumn,
  type DataTableColumn,
  type RowAction,
} from '@/components/data-table';
import { DeployToEnvironmentButton } from '@/components/deploy-to-environment-button';
import { serviceUrl } from '@/lib/api-base';
import type { StrategyListItem } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';

export function StrategiesTable({ strategies }: { strategies: StrategyListItem[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [cloningId, setCloningId] = useState<string | null>(null);

  const handleClone = useCallback(
    async (id: string) => {
      setCloningId(id);
      try {
        const res = await fetch(serviceUrl(`strategies/${id}/clone`), { method: 'POST' });
        if (!res.ok) return;
        const json = await res.json();
        const newId = json.data?.id;
        if (newId) {
          router.refresh();
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
        router.refresh();
      } catch {
        // ignore
      } finally {
        setDeletingId(null);
      }
    },
    [router],
  );

  const handleToggleActive = useCallback(
    async (id: string, currentlyActive: boolean) => {
      setTogglingId(id);
      try {
        const action = currentlyActive ? 'deactivate' : 'activate';
        const res = await fetch(serviceUrl(`strategies/${id}/${action}`), { method: 'POST' });
        if (!res.ok) return;
        router.refresh();
      } catch {
        // ignore
      } finally {
        setTogglingId(null);
      }
    },
    [router],
  );

  const actions = useMemo<RowAction<StrategyListItem>[]>(() => [
    { icon: 'clone', label: 'Clone strategy', onClick: (s) => handleClone(s.id), loading: (s) => cloningId === s.id },
    { render: (s) => <DeployToEnvironmentButton strategyId={s.id} variant="icon" /> },
    { icon: 'delete', label: 'Delete strategy', onClick: (s) => handleDelete(s.id, s.name), variant: 'danger', loading: (s) => deletingId === s.id },
  ], [handleClone, handleDelete, cloningId, deletingId]);

  const columns = useMemo<DataTableColumn<StrategyListItem>[]>(() => [
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
  ], [actions, handleToggleActive, togglingId]);

  return (
    <DataTable
      columns={columns}
      data={strategies}
      rowKey={(s) => s.id}
      emptyMessage="No strategies found."
    />
  );
}
