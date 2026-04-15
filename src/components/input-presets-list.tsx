'use client';

import { BulkDeleteBar } from '@/components/bulk-delete-bar';
import {
  DataTable,
  DateCell,
  NameCell,
  SearchBar,
  SelectAllCheckbox,
  StatusBadge,
  actionsColumn,
  checkboxColumn,
  type DataTableColumn,
} from '@/components/data-table';
import { useInfiniteList } from '@/hooks/use-infinite-list';
import { serviceUrl } from '@/lib/api-base';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';

export interface InputPresetRow {
  id: string;
  name: string | null;
  description: string | null;
  dollhouseView: string | null;
  realPhoto: string | null;
  moodBoard: string | null;
  stats?: { generationCount: number };
  createdAt: string;
  deletedAt: string | null;
  [key: string]: unknown;
}

export function InputPresetsList() {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [cloningId, setCloningId] = useState<string | null>(null);

  const {
    items,
    loading,
    loadingMore,
    hasMore,
    search,
    setSearch,
    loadMore,
    refresh,
  } = useInfiniteList<InputPresetRow>('input-presets', { limit: 20 });

  const handleClone = useCallback(async (id: string) => {
    setCloningId(id);
    try {
      const res = await fetch(serviceUrl(`input-presets/${id}/clone`), { method: 'POST' });
      if (!res.ok) return;
      const json = await res.json();
      const newId = json.data?.id;
      if (newId) {
        router.push(`/input-presets/${newId}/edit`);
      }
    } finally {
      setCloningId(null);
    }
  }, [router]);

  const activeItems = useMemo(() => items.filter((ip) => !ip.deletedAt), [items]);

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
      refresh();
    }
  }, [selected, refresh]);

  const columns = useMemo<DataTableColumn<InputPresetRow>[]>(() => [
    checkboxColumn<InputPresetRow>({
      selected,
      onToggle: toggleSelect,
      rowId: (ip) => ip.id,
      isSelectable: (ip) => !ip.deletedAt,
    }),
    {
      header: 'Name',
      cell: (ip) => <NameCell href={`/input-presets/${ip.id}`} name={ip.name} subtitle={ip.description} />,
      cellClassName: 'px-6 py-4',
    },
    {
      header: 'Generations',
      cell: (ip) => ip.stats?.generationCount ?? 0,
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
  ], [selected, toggleSelect, handleClone, cloningId]);

  const toolbar = (
    <div className="flex items-center gap-4">
      <div className="w-72">
        <SearchBar value={search} onChange={setSearch} placeholder="Search input presets..." />
      </div>
      <div className="ml-auto">
        <SelectAllCheckbox count={selected.size} total={activeItems.length} onToggle={toggleAll} />
      </div>
    </div>
  );

  return (
    <>
      <DataTable
        columns={columns}
        data={items}
        rowKey={(ip) => ip.id}
        rowClassName={(ip) => `hover:bg-gray-50 ${selected.has(ip.id) ? 'bg-primary-50/50' : ''}`}
        emptyMessage={search ? 'No input presets match your search.' : 'No input presets found.'}
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
        entityName="input presets"
      />
    </>
  );
}
