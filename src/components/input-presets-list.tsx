'use client';

import { BulkDeleteBar } from '@/components/bulk-delete-bar';
import {
  DataTable,
  DateCell,
  NameCell,
  StatusBadge,
  actionsColumn,
  checkboxColumn,
  type DataTableColumn,
} from '@/components/data-table';
import { Pagination } from '@/components/pagination';
import { serviceUrl } from '@/lib/api-base';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';

export interface InputPresetRow {
  id: string;
  name: string | null;
  description: string | null;
  imageCount: number;
  generationCount: number;
  createdAt: string;
  deletedAt: string | null;
}

interface InputPresetsListProps {
  data: InputPresetRow[];
  page: number;
  totalPages: number;
  total: number;
}

export function InputPresetsList({ data, page, totalPages, total }: InputPresetsListProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [cloningId, setCloningId] = useState<string | null>(null);

  const handleClone = useCallback(async (id: string) => {
    setCloningId(id);
    try {
      const res = await fetch(serviceUrl(`input-presets/${id}/clone`), { method: 'POST' });
      if (!res.ok) return;
      const json = await res.json();
      const newId = json.data?.id;
      if (newId) {
        router.refresh();
        router.push(`/input-presets/${newId}/edit`);
      }
    } finally {
      setCloningId(null);
    }
  }, [router]);

  const activeItems = data.filter((ip) => !ip.deletedAt);

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
      if (prev.size === activeItems.length) return new Set();
      return new Set(activeItems.map((ip) => ip.id));
    });
  }, [activeItems]);

  const handleBulkDelete = useCallback(async () => {
    const ids = [...selected];
    const res = await fetch(serviceUrl('input-presets/bulk-delete'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    if (res.ok) {
      setSelected(new Set());
      router.refresh();
    }
  }, [selected, router]);

  const allSelected = activeItems.length > 0 && selected.size === activeItems.length;

  const columns = useMemo<DataTableColumn<InputPresetRow>[]>(() => [
    checkboxColumn<InputPresetRow>({
      selected,
      onToggle: toggleSelect,
      onToggleAll: toggleAll,
      allSelected,
      rowId: (ip) => ip.id,
      isSelectable: (ip) => !ip.deletedAt,
    }),
    {
      header: 'Name',
      cell: (ip) => <NameCell href={`/input-presets/${ip.id}`} name={ip.name} subtitle={ip.description} />,
      cellClassName: 'px-6 py-4',
    },
    {
      header: 'Images',
      cell: (ip) => `${ip.imageCount} image${ip.imageCount !== 1 ? 's' : ''}`,
    },
    {
      header: 'Generations',
      cell: (ip) => ip.generationCount,
    },
    {
      header: 'Created',
      cell: (ip) => <DateCell date={ip.createdAt} />,
    },
    {
      header: 'Status',
      cell: (ip) => <StatusBadge status={ip.deletedAt ? 'deleted' : 'active'} />,
    },
    actionsColumn<InputPresetRow>([
      { icon: 'clone', label: 'Clone preset', onClick: (ip) => handleClone(ip.id), loading: (ip) => cloningId === ip.id, hidden: (ip) => !!ip.deletedAt },
    ]),
  ], [allSelected, toggleAll, selected, toggleSelect, handleClone, cloningId]);

  return (
    <>
      <DataTable
        columns={columns}
        data={data}
        rowKey={(ip) => ip.id}
        rowClassName={(ip) => `hover:bg-gray-50 ${selected.has(ip.id) ? 'bg-primary-50/50' : ''}`}
        emptyMessage="No input presets found."
        footer={<Pagination page={page} totalPages={totalPages} total={total} />}
      />

      <BulkDeleteBar
        selectedCount={selected.size}
        onDelete={handleBulkDelete}
        onClearSelection={() => setSelected(new Set())}
        entityName="input presets"
      />
    </>
  );
}
