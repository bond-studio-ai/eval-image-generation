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
import { serviceUrl } from '@/lib/api-base';
import type { EnvironmentListItem } from '@/lib/service-client';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';

export function EnvironmentsTable({ environments }: { environments: EnvironmentListItem[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = useCallback(
    async (id: string, name: string) => {
      if (!confirm(`Delete environment "${name}"?`)) return;
      setDeletingId(id);
      try {
        const res = await fetch(serviceUrl(`environments/${id}`), { method: 'DELETE' });
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

  const actions = useMemo<RowAction<EnvironmentListItem>[]>(() => [
    { icon: 'edit', label: 'Edit environment', onClick: (item) => router.push(`/environments/${item.id}/edit`) },
    { icon: 'delete', label: 'Delete environment', onClick: (item) => handleDelete(item.id, item.name), variant: 'danger', loading: (item) => deletingId === item.id },
  ], [handleDelete, deletingId, router]);

  const columns = useMemo<DataTableColumn<EnvironmentListItem>[]>(() => [
    {
      header: 'Name',
      cell: (item) => <NameCell href={`/environments/${item.id}/edit`} name={item.name} />,
      cellClassName: 'px-6 py-4',
    },
    {
      header: 'Hostname',
      cell: (item) => item.apiHostname,
    },
    {
      header: 'Status',
      cell: (item) => <StatusBadge status={item.isActive ? 'active' : 'inactive'} />,
    },
    {
      header: 'Auth',
      cell: (item) => (
        <StatusBadge
          status={item.hasAuthToken ? 'active' : 'inactive'}
          label={item.hasAuthToken ? 'Configured' : 'Missing'}
        />
      ),
    },
    {
      header: 'Created',
      cell: (item) => <DateCell date={item.createdAt} />,
    },
    actionsColumn(actions),
  ], [actions]);

  return (
    <DataTable
      columns={columns}
      data={environments}
      rowKey={(item) => item.id}
      emptyMessage="No environments created yet."
    />
  );
}
